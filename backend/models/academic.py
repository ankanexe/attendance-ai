from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    credits = Column(Integer, nullable=False)

class Section(Base):
    __tablename__ = "sections"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False)
    faculty_id = Column(String, ForeignKey("faculty.id"), nullable=False)
    section_name = Column(String, nullable=False)
    room_number = Column(String, nullable=True)
    student_count = Column(Integer, default=0)

class StudentSubjectEnrollment(Base):
    __tablename__ = "student_subject_enrollments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, ForeignKey("students.id"), nullable=False)
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False)
    section_id = Column(String, ForeignKey("sections.id"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
