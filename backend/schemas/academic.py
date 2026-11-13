from pydantic import BaseModel
from typing import Optional

class SubjectResponse(BaseModel):
    id: str
    code: str
    name: str
    department: str
    semester: int
    credits: int
    class Config:
        from_attributes = True

class SectionResponse(BaseModel):
    id: str
    subject_id: str
    faculty_id: str
    section_name: str
    room_number: Optional[str] = None
    student_count: int
    class Config:
        from_attributes = True
