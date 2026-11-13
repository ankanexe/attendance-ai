from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models.attendance import RecognitionEvent
from models.user import Student
from typing import Optional

router = APIRouter(prefix="/api/recognition-logs", tags=["recognition-logs"])

def serialize_rec(r: RecognitionEvent, db: Session):
    stu = db.query(Student).filter(Student.id == r.candidate_student_id).first() if r.candidate_student_id else None
    return {
        "id": r.id,
        "session_id": r.session_id,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "bounding_box": r.bounding_box,
        "candidate_student_id": r.candidate_student_id,
        "recognition_score": r.recognition_score,
        "result_state": r.result_state,
        "snapshot_path": r.snapshot_path,
        "candidate_student": {
            "id": stu.id,
            "full_name": stu.full_name,
            "student_id": stu.student_id
        } if stu else None
    }

@router.get("")
def list_recognition_logs(
    session_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(RecognitionEvent).order_by(RecognitionEvent.timestamp.desc())
    if session_id:
        query = query.filter(RecognitionEvent.session_id == session_id)

    total = query.count()
    items = query.limit(limit).all()

    return {
        "items": [serialize_rec(r, db) for r in items],
        "total": total
    }
