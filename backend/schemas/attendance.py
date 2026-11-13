from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AttendanceRecordBase(BaseModel):
    session_id: str
    student_id: str
    status: str
    marked_method: str

class AttendanceMark(BaseModel):
    student_id: str
    recognition_score: float

class AttendanceResponse(AttendanceRecordBase):
    id: str
    timestamp: datetime
    recognition_score: Optional[float]
    liveness_score: Optional[float]
    is_verified: bool
    verified_by_faculty_id: Optional[str]
    verification_timestamp: Optional[datetime]
    verification_note: Optional[str]
    ai_recommendation: Optional[str]
    class Config:
        from_attributes = True
