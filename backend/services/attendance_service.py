from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models.attendance import AttendanceRecord
from typing import Optional

def determine_status(session_start: datetime, marked_time: datetime, grace_period_minutes: int) -> str:
    grace_end = session_start + timedelta(minutes=grace_period_minutes)
    if marked_time <= grace_end:
        return "PRESENT"
    else:
        return "LATE"

def check_duplicate(db: Session, session_id: str, student_id: str) -> Optional[AttendanceRecord]:
    return db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == student_id
    ).first()
