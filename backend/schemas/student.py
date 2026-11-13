from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class StudentBase(BaseModel):
    student_id: str
    roll_number: str
    full_name: str
    email: EmailStr
    department: str
    semester: int
    section: str

class StudentCreate(StudentBase):
    pass

class StudentResponse(StudentBase):
    id: str
    status: str
    face_enrolled: bool
    face_sample_count: int
    created_at: datetime
    class Config:
        from_attributes = True
