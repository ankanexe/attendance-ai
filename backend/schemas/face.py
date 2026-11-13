from pydantic import BaseModel
from datetime import datetime

class FaceTemplateResponse(BaseModel):
    id: str
    student_id: str
    quality_score: float
    source_type: str
    created_at: datetime
    class Config:
        from_attributes = True
