from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Text
from database import Base
import uuid
from datetime import datetime

class FaceTemplate(Base):
    __tablename__ = "face_templates"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, ForeignKey("students.id"), nullable=False)
    embedding = Column(Text, nullable=False)
    quality_score = Column(Float, nullable=True)
    source_type = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
