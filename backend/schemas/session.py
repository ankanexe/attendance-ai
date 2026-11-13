from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class SessionBase(BaseModel):
    subject_id: str
    section_id: str
    faculty_id: str
    room_number: Optional[str] = None
    session_date: date
    grace_period_minutes: int = 10

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase):
    id: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    status: str
    present_count: int
    late_count: int
    verify_count: int
    unknown_count: int
    total_enrolled: int
    class Config:
        from_attributes = True
