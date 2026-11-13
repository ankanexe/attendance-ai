from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Set
from sqlalchemy.orm import Session
import base64
import numpy as np
import cv2
import traceback
from datetime import datetime, timedelta

from .face_engine import FaceEngine
from .enrollment import EnrollmentSession
from database import get_db
from models.face import FaceTemplate
from models.user import Student
from models.session import ClassSession
from models.academic import StudentSubjectEnrollment
from models.attendance import AttendanceRecord, RecognitionEvent
from services.attendance_service import determine_status, check_duplicate
from websocket.manager import manager

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Global singletons
engine = FaceEngine()
active_enrollments: Dict[str, EnrollmentSession] = {}

class ProcessFrameRequest(BaseModel):
    frame: Optional[str] = None
    image_base64: Optional[str] = None
    session_id: Optional[str] = None

class EnrollStartRequest(BaseModel):
    student_id: str

class EnrollCaptureRequest(BaseModel):
    student_id: str
    frame: Optional[str] = None
    image_base64: Optional[str] = None

class LoadTemplatesRequest(BaseModel):
    templates: Optional[List[Dict[str, Any]]] = None

def decode_base64_image(base64_str: str) -> Optional[np.ndarray]:
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_data = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"[AI Router] Error decoding image: {e}")
        return None

def encode_image_base64(img: np.ndarray) -> str:
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

def ensure_templates_loaded(db: Session):
    if engine.vector_search.total_vectors == 0:
        templates = db.query(FaceTemplate).all()
        if templates:
            engine.load_templates([{"student_id": t.student_id, "embedding": t.embedding} for t in templates])

@router.post("/process-frame")
async def process_frame(req: ProcessFrameRequest, db: Session = Depends(get_db)):
    raw_b64 = req.frame or req.image_base64
    if not raw_b64:
        raise HTTPException(status_code=400, detail="Missing video frame data")

    img = decode_base64_image(raw_b64)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image base64 format")

    ensure_templates_loaded(db)

    # Get session roster IDs if session is active
    session_enrolled_ids: Optional[Set[str]] = None
    sess: Optional[ClassSession] = None
    
    if req.session_id and req.session_id != "test-session":
        sess = db.query(ClassSession).filter(ClassSession.id == req.session_id).first()
        if sess and sess.status == "ACTIVE":
            # Find all students enrolled in this subject and section
            enrollments = db.query(StudentSubjectEnrollment).filter(
                StudentSubjectEnrollment.subject_id == sess.subject_id,
                StudentSubjectEnrollment.section_id == sess.section_id
            ).all()
            if enrollments:
                session_enrolled_ids = {e.student_id for e in enrollments}
            else:
                # If no explicit enrollment records found, fallback to section students
                sec_students = db.query(Student).filter(Student.section == sess.section_id).all()
                if sec_students:
                    session_enrolled_ids = {s.id for s in sec_students}

    try:
        results = engine.process_frame(img, session_enrolled_ids=session_enrolled_ids)
        res_list = [engine.result_to_dict(r) for r in results]

        # If a live class session is active, process real-time attendance marking
        if sess and sess.status == "ACTIVE":
            for r in results:
                # 1. Log every recognition event
                rec_evt = RecognitionEvent(
                    session_id=sess.id,
                    bounding_box=str(list(r.bounding_box)),
                    candidate_student_id=r.student_id,
                    recognition_score=r.recognition_score,
                    result_state=r.state
                )
                db.add(rec_evt)

                # 2. If MATCHED (and in session roster): Check duplicates & record attendance
                if r.state == "MATCHED" and r.student_id:
                    existing = check_duplicate(db, sess.id, r.student_id)
                    student_obj = db.query(Student).filter(Student.id == r.student_id).first()
                    student_name = student_obj.full_name if student_obj else "Student"

                    if existing:
                        # Already marked — broadcast duplicate notice without creating duplicate row
                        await manager.broadcast_to_session(sess.id, {
                            "type": "duplicate_suppressed",
                            "student_id": r.student_id,
                            "student_name": student_name,
                            "original_time": existing.timestamp.strftime("%I:%M:%S %p") if existing.timestamp else "",
                            "status": existing.status,
                            "message": f"{student_name} already marked at {existing.timestamp.strftime('%I:%M:%S %p') if existing.timestamp else ''}"
                        })
                    else:
                        # New attendance record
                        now_utc = datetime.utcnow()
                        status = determine_status(sess.start_time or now_utc, now_utc, sess.grace_period_minutes)
                        att_record = AttendanceRecord(
                            session_id=sess.id,
                            student_id=r.student_id,
                            status=status,
                            recognition_score=r.recognition_score,
                            marked_method="AI_CAMERA",
                            ai_recommendation=status
                        )
                        db.add(att_record)
                        if status == "PRESENT":
                            sess.present_count += 1
                        elif status == "LATE":
                            sess.late_count += 1
                        db.commit()

                        # Broadcast live attendance event over WebSocket
                        await manager.broadcast_to_session(sess.id, {
                            "type": "attendance_marked",
                            "student_id": r.student_id,
                            "student_name": student_name,
                            "status": status,
                            "recognition_score": round(r.recognition_score * 100, 1),
                            "attendance_id": att_record.id,
                            "timestamp": now_utc.isoformat()
                        })

                # 3. If NOT_IN_SESSION (Recognized student from another section)
                elif r.state == "NOT_IN_SESSION" and r.student_id:
                    student_obj = db.query(Student).filter(Student.id == r.student_id).first()
                    student_name = student_obj.full_name if student_obj else "Student"
                    await manager.broadcast_to_session(sess.id, {
                        "type": "not_enrolled_in_session",
                        "student_id": r.student_id,
                        "student_name": student_name,
                        "recognition_score": round(r.recognition_score * 100, 1),
                        "message": f"{student_name} is recognized but not enrolled in this section"
                    })

                # 4. If AMBIGUOUS (60%–79%): Broadcast to faculty Verify drawer
                elif r.state == "AMBIGUOUS" and r.student_id:
                    student_obj = db.query(Student).filter(Student.id == r.student_id).first()
                    student_name = student_obj.full_name if student_obj else "Candidate"
                    await manager.broadcast_to_session(sess.id, {
                        "type": "recognition_event",
                        "student_id": r.student_id,
                        "student_name": student_name,
                        "status": "VERIFY",
                        "result_state": "AMBIGUOUS",
                        "recognition_score": round(r.recognition_score * 100, 1),
                        "timestamp": datetime.utcnow().isoformat()
                    })

            db.commit()

        return res_list
    except Exception as e:
        print(f"[AI Router] Process frame error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enroll/start")
async def enroll_start(req: EnrollStartRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == req.student_id).first()
    student_name = student.full_name if student else "Student"
    active_enrollments[req.student_id] = EnrollmentSession(req.student_id, student_name=student_name)
    return active_enrollments[req.student_id].get_current_guidance()

@router.post("/enroll/capture")
async def enroll_capture(req: EnrollCaptureRequest, db: Session = Depends(get_db)):
    if req.student_id not in active_enrollments:
        student = db.query(Student).filter(Student.id == req.student_id).first()
        student_name = student.full_name if student else "Student"
        active_enrollments[req.student_id] = EnrollmentSession(req.student_id, student_name=student_name)

    raw_b64 = req.frame or req.image_base64
    if not raw_b64:
        raise HTTPException(status_code=400, detail="Missing camera frame data")

    img = decode_base64_image(raw_b64)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image base64")

    session = active_enrollments[req.student_id]
    try:
        result = session.process_frame(img)
        return result
    except Exception as e:
        print(f"[AI Router] Enroll capture error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/enroll/status/{student_id}")
async def enroll_status(student_id: str):
    if student_id not in active_enrollments:
        return {"status": "IDLE", "step": 1, "total_steps": 3, "completed_count": 0}
    return active_enrollments[student_id].get_current_guidance()

@router.post("/enroll/finalize")
async def enroll_finalize(req: EnrollStartRequest, db: Session = Depends(get_db)):
    if req.student_id not in active_enrollments:
        raise HTTPException(status_code=404, detail="Enrollment session not found")

    session = active_enrollments[req.student_id]
    embeddings = session.get_serialized_embeddings()

    if len(embeddings) == 0:
        raise HTTPException(status_code=400, detail="No face samples captured yet.")

    student = db.query(Student).filter(Student.id == req.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in database")

    # Clear prior templates for this student to maintain clean 3-sample representation
    db.query(FaceTemplate).filter(FaceTemplate.student_id == req.student_id).delete()

    for idx, emb_str in enumerate(embeddings):
        template = FaceTemplate(
            student_id=req.student_id,
            embedding=emb_str,
            quality_score=0.92,
            source_type=f"WEBCAM_SAMPLE_{idx+1}_OF_3"
        )
        db.add(template)

    student.face_enrolled = True
    student.face_sample_count = len(embeddings)
    db.commit()

    # Reload vector search index with all enrolled templates
    all_templates = db.query(FaceTemplate).all()
    engine.load_templates([{"student_id": t.student_id, "embedding": t.embedding} for t in all_templates])

    del active_enrollments[req.student_id]

    return {
        "status": "success",
        "student_id": req.student_id,
        "sample_count": len(embeddings),
        "message": f"Successfully registered 3 face templates for {student.full_name}!"
    }

@router.get("/camera/devices")
async def camera_devices():
    devices = []
    for i in range(3):
        try:
            cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
            if cap.isOpened():
                devices.append(i)
                cap.release()
        except Exception:
            pass
    if not devices:
        devices = [0]
    return devices

@router.post("/camera/test")
async def camera_test():
    try:
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            return {"status": "ok", "message": "Camera ready via browser WebRTC"}
        ret, frame = cap.read()
        cap.release()
        if ret:
            img_b64 = encode_image_base64(frame)
            return {"status": "success", "image_base64": f"data:image/jpeg;base64,{img_b64}"}
    except Exception:
        pass
    return {"status": "ok", "message": "Camera ready via browser WebRTC"}

@router.get("/status")
async def engine_status(db: Session = Depends(get_db)):
    ensure_templates_loaded(db)
    return {
        "status": "online",
        "templates_loaded": engine.vector_search.total_vectors,
        "unique_students": engine.vector_search.unique_students_count,
        "match_threshold": engine.match_threshold,
        "verify_threshold": engine.verify_threshold
    }

@router.post("/load-templates")
async def load_templates(db: Session = Depends(get_db)):
    templates = db.query(FaceTemplate).all()
    engine.load_templates([{"student_id": t.student_id, "embedding": t.embedding} for t in templates])
    return {
        "status": "success",
        "total_templates": engine.vector_search.total_vectors,
        "unique_students": engine.vector_search.unique_students_count
    }
