from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer, ForeignKey
from sqlalchemy.orm import relationship
import enum
import uuid
from datetime import datetime
from database import Base

class RoleEnum(str, enum.Enum):
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    faculty_profile = relationship("Faculty", back_populates="user", uselist=False)
    student_profile = relationship("Student", back_populates="user", uselist=False)

class Faculty(Base):
    __tablename__ = "faculty"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    department = Column(String, nullable=False)
    designation = Column(String, nullable=False)
    phone = Column(String, nullable=True)

    user = relationship("User", back_populates="faculty_profile")

class Student(Base):
    __tablename__ = "students"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, unique=True, index=True, nullable=False)
    roll_number = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    department = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    section = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")
    face_enrolled = Column(Boolean, default=False)
    face_sample_count = Column(Integer, default=0)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="student_profile")
