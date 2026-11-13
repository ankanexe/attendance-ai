from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.academic import Subject
from typing import List

router = APIRouter(prefix="/api/subjects", tags=["subjects"])

@router.get("")
def list_subjects(db: Session = Depends(get_db)):
    subjects = db.query(Subject).all()
    return [
        {
            "id": s.id,
            "code": s.code,
            "name": s.name,
            "department": s.department,
            "semester": s.semester,
            "credits": s.credits
        }
        for s in subjects
    ]

@router.post("")
def create_subject(body: dict, db: Session = Depends(get_db)):
    existing = db.query(Subject).filter(Subject.code == body["code"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject code already exists")

    new_sub = Subject(
        code=body["code"],
        name=body["name"],
        department=body.get("department", "CSE"),
        semester=int(body.get("semester", 3)),
        credits=int(body.get("credits", 3))
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return {
        "id": new_sub.id,
        "code": new_sub.code,
        "name": new_sub.name,
        "department": new_sub.department,
        "semester": new_sub.semester,
        "credits": new_sub.credits
    }

@router.get("/{id}")
def get_subject(id: str, db: Session = Depends(get_db)):
    s = db.query(Subject).filter(Subject.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {
        "id": s.id,
        "code": s.code,
        "name": s.name,
        "department": s.department,
        "semester": s.semester,
        "credits": s.credits
    }
