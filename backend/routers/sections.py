from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models.academic import Section, Subject
from typing import List, Optional

router = APIRouter(prefix="/api/sections", tags=["sections"])

@router.get("")
def list_sections(subject_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Section)
    if subject_id:
        query = query.filter(Section.subject_id == subject_id)
    sections = query.all()
    return [
        {
            "id": s.id,
            "subject_id": s.subject_id,
            "faculty_id": s.faculty_id,
            "section_name": s.section_name,
            "room_number": s.room_number,
            "student_count": s.student_count
        }
        for s in sections
    ]

@router.get("/{id}")
def get_section(id: str, db: Session = Depends(get_db)):
    s = db.query(Section).filter(Section.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Section not found")
    return {
        "id": s.id,
        "subject_id": s.subject_id,
        "faculty_id": s.faculty_id,
        "section_name": s.section_name,
        "room_number": s.room_number,
        "student_count": s.student_count
    }
