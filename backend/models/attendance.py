from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("class_sessions.id"), nullable=False)
    student_id = Column(String, ForeignKey("students.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, nullable=False) # PRESENT/LATE/VERIFY/ABSENT
    recognition_score = Column(Float, nullable=True)
    liveness_score = Column(Float, nullable=True)
    is_verified = Column(Boolean, default=False)
    verified_by_faculty_id = Column(String, ForeignKey("faculty.id"), nullable=True)
    verification_timestamp = Column(DateTime, nullable=True)
    verification_note = Column(String, nullable=True)
    ai_recommendation = Column(String, nullable=True)
    marked_method = Column(String, nullable=False)

class RecognitionEvent(Base):
    __tablename__ = "recognition_events"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("class_sessions.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    bounding_box = Column(String, nullable=True)
    candidate_student_id = Column(String, nullable=True)
    recognition_score = Column(Float, nullable=True)
    result_state = Column(String, nullable=False)
    snapshot_path = Column(String, nullable=True)
