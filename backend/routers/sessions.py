from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models.session import ClassSession
from models.academic import Subject, Section, StudentSubjectEnrollment
from models.user import Student
from models.attendance import AttendanceRecord, RecognitionEvent
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

def serialize_session_summary(s: ClassSession, db: Session):
    sub = db.query(Subject).filter(Subject.id == s.subject_id).first()
    sec = db.query(Section).filter(Section.id == s.section_id).first()
    
    # Calculate actual enrolled count
    enrolled_count = db.query(StudentSubjectEnrollment).filter(
        StudentSubjectEnrollment.subject_id == s.subject_id,
        StudentSubjectEnrollment.section_id == s.section_id
    ).count()
    if enrolled_count == 0:
        enrolled_count = db.query(Student).filter(Student.section == (sec.section_name if sec else "")).count()
    if enrolled_count == 0:
        enrolled_count = s.total_enrolled or 30

    return {
        "id": s.id,
        "subject_id": s.subject_id,
        "section_id": s.section_id,
        "faculty_id": s.faculty_id,
        "room_number": s.room_number or (sec.room_number if sec else "LH-301"),
        "session_date": s.session_date.isoformat() if s.session_date else None,
        "start_time": s.start_time.isoformat() if s.start_time else None,
        "end_time": s.end_time.isoformat() if s.end_time else None,
        "grace_period_minutes": s.grace_period_minutes,
        "status": s.status,
        "present_count": s.present_count,
        "late_count": s.late_count,
        "verify_count": s.verify_count,
        "unknown_count": s.unknown_count,
        "total_enrolled": enrolled_count,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "subject": {
            "id": sub.id,
            "code": sub.code,
            "name": sub.name,
            "department": sub.department,
            "semester": sub.semester,
            "credits": sub.credits
        } if sub else None,
        "section": {
            "id": sec.id,
            "subject_id": sec.subject_id,
            "faculty_id": sec.faculty_id,
            "section_name": sec.section_name,
            "room_number": sec.room_number,
            "student_count": sec.student_count
        } if sec else None
    }

@router.get("/today")
def get_todays_classes(db: Session = Depends(get_db)):
    """Return all scheduled and active classes for today."""
    today = date.today()
    sessions = db.query(ClassSession).filter(ClassSession.session_date == today).all()
    
    # If no sessions scheduled for today yet, create/fetch current week's upcoming classes
    if not sessions:
        subjects = db.query(Subject).all()
        sections = db.query(Section).all()
        if subjects and sections:
            # Create a scheduled session for immediate demonstration
            sub = subjects[0]
            sec = sections[0]
            new_sess = ClassSession(
                subject_id=sub.id,
                section_id=sec.id,
                faculty_id=sec.faculty_id,
                room_number=sec.room_number or "LH-301",
                session_date=today,
                start_time=datetime.utcnow() - timedelta(minutes=10),
                grace_period_minutes=10,
                status="ACTIVE",
                present_count=0,
                late_count=0,
                total_enrolled=30
            )
            db.add(new_sess)
            db.commit()
            db.refresh(new_sess)
            sessions = [new_sess]

    return [serialize_session_summary(s, db) for s in sessions]

@router.get("")
def list_sessions(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(ClassSession).order_by(ClassSession.session_date.desc(), ClassSession.created_at.desc())
    if status and status != "ALL":
        query = query.filter(ClassSession.status == status)

    total = query.count()
    sessions = query.limit(limit).all()

    return {
        "items": [serialize_session_summary(s, db) for s in sessions],
        "total": total
    }

@router.get("/{id}")
def get_session(id: str, db: Session = Depends(get_db)):
    sess = db.query(ClassSession).filter(ClassSession.id == id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return serialize_session_summary(sess, db)

@router.get("/{id}/attendance-detail")
def get_session_attendance_detail(id: str, db: Session = Depends(get_db)):
    """
    Returns the comprehensive 'Who Attended' breakdown for a session.
    Provides student rosters for Present, Late, Absent, Verify, and Unknown.
    """
    sess = db.query(ClassSession).filter(ClassSession.id == id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sub = db.query(Subject).filter(Subject.id == sess.subject_id).first()
    sec = db.query(Section).filter(Section.id == sess.section_id).first()

    # 1. Get all enrolled students for this session
    enrollments = db.query(StudentSubjectEnrollment).filter(
        StudentSubjectEnrollment.subject_id == sess.subject_id,
        StudentSubjectEnrollment.section_id == sess.section_id
    ).all()
    if enrollments:
        enrolled_student_ids = [e.student_id for e in enrollments]
        enrolled_students = db.query(Student).filter(Student.id.in_(enrolled_student_ids)).all()
    else:
        # Fallback to all students in section
        enrolled_students = db.query(Student).filter(Student.section == (sec.section_name if sec else "")).all()
        if not enrolled_students:
            enrolled_students = db.query(Student).limit(30).all()

    # 2. Get attendance records for this session
    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == id).all()
    record_map = {r.student_id: r for r in records}

    present_list = []
    late_list = []
    absent_list = []
    verify_list = []

    start_t = sess.start_time or datetime.utcnow()

    for s in enrolled_students:
        r = record_map.get(s.id)
        if r:
            time_str = r.timestamp.strftime("%I:%M:%S %p") if r.timestamp else "—"
            score_pct = round(r.recognition_score * 100, 1) if r.recognition_score is not None else None
            
            # Minutes late calculation
            mins_late = 0
            if r.timestamp and sess.start_time:
                diff_sec = (r.timestamp - sess.start_time).total_seconds()
                mins_late = max(0, int(diff_sec // 60))

            item = {
                "student_id": s.id,
                "university_id": s.student_id,
                "roll_number": s.roll_number,
                "full_name": s.full_name,
                "email": s.email,
                "status": r.status,
                "time": time_str,
                "score": score_pct,
                "minutes_late": mins_late,
                "is_verified": r.is_verified,
                "verification_note": r.verification_note,
                "marked_method": r.marked_method
            }

            if r.status == "PRESENT":
                present_list.append(item)
            elif r.status == "LATE":
                late_list.append(item)
            elif r.status == "VERIFY":
                verify_list.append(item)
            elif r.status == "ABSENT":
                absent_list.append(item)
        else:
            # Enrolled student without record -> ABSENT (calculated dynamically)
            absent_list.append({
                "student_id": s.id,
                "university_id": s.student_id,
                "roll_number": s.roll_number,
                "full_name": s.full_name,
                "email": s.email,
                "status": "ABSENT",
                "time": "—",
                "score": None,
                "minutes_late": 0,
                "is_verified": False,
                "marked_method": "AUTO_ABSENT"
            })

    # 3. Get Unknown recognition events
    unknown_events = db.query(RecognitionEvent).filter(
        RecognitionEvent.session_id == id,
        RecognitionEvent.result_state == "UNKNOWN"
    ).all()
    unknown_list = [
        {
            "id": u.id,
            "timestamp": u.timestamp.strftime("%I:%M:%S %p") if u.timestamp else "—",
            "score": round((u.recognition_score or 0) * 100, 1),
            "result_state": "UNKNOWN",
            "bounding_box": u.bounding_box
        }
        for u in unknown_events
    ]

    return {
        "session": serialize_session_summary(sess, db),
        "counts": {
            "enrolled": len(enrolled_students),
            "present": len(present_list),
            "late": len(late_list),
            "absent": len(absent_list),
            "verify": len(verify_list),
            "unknown": len(unknown_list)
        },
        "rosters": {
            "all": present_list + late_list + verify_list + absent_list,
            "present": present_list,
            "late": late_list,
            "absent": absent_list,
            "verify": verify_list,
            "unknown": unknown_list
        }
    }

@router.post("")
def create_session(sess_data: dict, db: Session = Depends(get_db)):
    sess_date = sess_data.get("session_date")
    if isinstance(sess_date, str):
        parsed_date = datetime.strptime(sess_date, "%Y-%m-%d").date()
    else:
        parsed_date = date.today()

    new_sess = ClassSession(
        subject_id=sess_data["subject_id"],
        section_id=sess_data["section_id"],
        faculty_id=sess_data.get("faculty_id", "faculty-uuid"),
        room_number=sess_data.get("room_number", "LH-301"),
        session_date=parsed_date,
        grace_period_minutes=int(sess_data.get("grace_period_minutes", 10)),
        status="UPCOMING",
        total_enrolled=30
    )
    db.add(new_sess)
    db.commit()
    db.refresh(new_sess)
    return serialize_session_summary(new_sess, db)

@router.put("/{id}/start")
def start_session(id: str, db: Session = Depends(get_db)):
    sess = db.query(ClassSession).filter(ClassSession.id == id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    sess.status = "ACTIVE"
    sess.start_time = datetime.utcnow()
    db.commit()
    db.refresh(sess)
    return serialize_session_summary(sess, db)

@router.put("/{id}/end")
def end_session(id: str, db: Session = Depends(get_db)):
    """
    Finalize attendance session:
    - Calculates all unrecorded enrolled students as ABSENT in the database.
    - Transitions session status to COMPLETED.
    - Records end_time.
    """
    sess = db.query(ClassSession).filter(ClassSession.id == id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sess.status = "COMPLETED"
    sess.end_time = datetime.utcnow()

    # Find enrolled students
    enrollments = db.query(StudentSubjectEnrollment).filter(
        StudentSubjectEnrollment.subject_id == sess.subject_id,
        StudentSubjectEnrollment.section_id == sess.section_id
    ).all()
    if enrollments:
        enrolled_student_ids = [e.student_id for e in enrollments]
    else:
        sec = db.query(Section).filter(Section.id == sess.section_id).first()
        sec_students = db.query(Student).filter(Student.section == (sec.section_name if sec else "")).all()
        enrolled_student_ids = [s.id for s in sec_students] or [s.id for s in db.query(Student).limit(30).all()]

    # Existing attendance records
    existing_records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == id).all()
    marked_student_ids = {r.student_id for r in existing_records}

    # Automatically insert ABSENT records for all unrecorded students
    for s_id in enrolled_student_ids:
        if s_id not in marked_student_ids:
            absent_rec = AttendanceRecord(
                session_id=id,
                student_id=s_id,
                status="ABSENT",
                recognition_score=None,
                marked_method="AUTO_ABSENT",
                ai_recommendation="ABSENT"
            )
            db.add(absent_rec)

    db.commit()
    db.refresh(sess)
    return serialize_session_summary(sess, db)

@router.get("/{id}/summary")
def get_session_summary(id: str, db: Session = Depends(get_db)):
    sess = db.query(ClassSession).filter(ClassSession.id == id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": sess.id,
        "status": sess.status,
        "present_count": sess.present_count,
        "late_count": sess.late_count,
        "absent_count": max(0, (sess.total_enrolled or 30) - (sess.present_count + sess.late_count)),
        "verify_count": sess.verify_count,
        "total_enrolled": sess.total_enrolled or 30
    }
