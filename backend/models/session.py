from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime

class ClassSession(Base):
    __tablename__ = "class_sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False)
    section_id = Column(String, ForeignKey("sections.id"), nullable=False)
    faculty_id = Column(String, ForeignKey("faculty.id"), nullable=False)
    room_number = Column(String, nullable=True)
    session_date = Column(Date, nullable=False)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    grace_period_minutes = Column(Integer, default=10)
    status = Column(String, default="UPCOMING") # UPCOMING/ACTIVE/COMPLETED/CANCELLED
    present_count = Column(Integer, default=0)
    late_count = Column(Integer, default=0)
    verify_count = Column(Integer, default=0)
    unknown_count = Column(Integer, default=0)
    total_enrolled = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
