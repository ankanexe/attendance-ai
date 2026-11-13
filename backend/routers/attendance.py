from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models.attendance import AttendanceRecord
from models.session import ClassSession
from models.user import Student
from models.academic import Subject
from models.system import AuditLog
from schemas.attendance import AttendanceMark, AttendanceResponse
from services.attendance_service import determine_status, check_duplicate
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

def serialize_attendance(r: AttendanceRecord, db: Session):
    stu = db.query(Student).filter(Student.id == r.student_id).first()
    sess = db.query(ClassSession).filter(ClassSession.id == r.session_id).first()
    sub = db.query(Subject).filter(Subject.id == sess.subject_id).first() if sess else None

    return {
        "id": r.id,
        "session_id": r.session_id,
        "student_id": r.student_id,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "status": r.status,
        "recognition_score": r.recognition_score,
        "liveness_score": r.liveness_score,
        "is_verified": r.is_verified,
        "verified_by_faculty_id": r.verified_by_faculty_id,
        "verification_timestamp": r.verification_timestamp.isoformat() if r.verification_timestamp else None,
        "verification_note": r.verification_note,
        "ai_recommendation": r.ai_recommendation,
        "marked_method": r.marked_method,
        "student": {
            "id": stu.id,
            "student_id": stu.student_id,
            "roll_number": stu.roll_number,
            "full_name": stu.full_name,
            "email": stu.email
        } if stu else None,
        "session": {
            "id": sess.id,
            "room_number": sess.room_number,
            "session_date": sess.session_date.isoformat() if sess and sess.session_date else None,
            "subject": {
                "name": sub.name,
                "code": sub.code
            } if sub else None
        } if sess else None
    }

@router.get("")
def get_attendance(
    session_id: Optional[str] = Query(None),
    student_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceRecord).order_by(AttendanceRecord.timestamp.desc())
    if session_id:
        query = query.filter(AttendanceRecord.session_id == session_id)
    if student_id:
        query = query.filter(AttendanceRecord.student_id == student_id)
    if status:
        query = query.filter(AttendanceRecord.status == status)

    total = query.count()
    records = query.limit(limit).all()

    return {
        "items": [serialize_attendance(r, db) for r in records],
        "total": total
    }

@router.get("/{id}")
def get_attendance_detail(id: str, db: Session = Depends(get_db)):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return serialize_attendance(record, db)

@router.post("/mark")
def mark_attendance(data: AttendanceMark, session_id: str, db: Session = Depends(get_db)):
    sess = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    if sess.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Session is not active")

    existing = check_duplicate(db, session_id, data.student_id)
    if existing:
        return serialize_attendance(existing, db)

    status = determine_status(sess.start_time or datetime.utcnow(), datetime.utcnow(), sess.grace_period_minutes)

    record = AttendanceRecord(
        session_id=session_id,
        student_id=data.student_id,
        status=status,
        recognition_score=data.recognition_score,
        marked_method="AI_CAMERA",
        ai_recommendation=status
    )
    db.add(record)

    if status == "PRESENT":
        sess.present_count += 1
    elif status == "LATE":
        sess.late_count += 1

    db.commit()
    db.refresh(record)
    return serialize_attendance(record, db)

@router.put("/{id}/verify")
def verify_attendance(id: str, body: dict = {}, db: Session = Depends(get_db)):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    record.is_verified = True
    record.status = "PRESENT"
    record.verification_timestamp = datetime.utcnow()
    record.verification_note = body.get("note", "Confirmed by faculty in verification drawer")
    record.marked_method = "VERIFY_CONFIRMED"

    # Log audit
    audit = AuditLog(
        user_id="faculty-current",
        action="ATTENDANCE_VERIFIED",
        details_json=f'{{"record_id": "{id}", "student_id": "{record.student_id}", "note": "{record.verification_note}"}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(record)
    return serialize_attendance(record, db)

@router.put("/{id}/correct")
def correct_attendance(id: str, body: dict, db: Session = Depends(get_db)):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    old_status = record.status
    record.status = body.get("status", record.status)
    record.verification_note = body.get("note", "Manual faculty correction")
    record.marked_method = "FACULTY_MANUAL"

    # Log audit
    audit = AuditLog(
        user_id="faculty-current",
        action="MANUAL_CORRECTION",
        details_json=f'{{"record_id": "{id}", "old_status": "{old_status}", "new_status": "{record.status}", "note": "{record.verification_note}"}}'
    )
    db.add(audit)
    db.commit()
    db.refresh(record)
    return serialize_attendance(record, db)

@router.get("/session/{session_id}")
def get_session_attendance(session_id: str, db: Session = Depends(get_db)):
    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    return [serialize_attendance(r, db) for r in records]
