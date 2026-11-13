from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.face import FaceTemplate
from models.user import Student
from typing import List

router = APIRouter(prefix="/api/face", tags=["face"])

@router.get("/{student_id}")
def get_face_status(student_id: str, db: Session = Depends(get_db)):
    templates = db.query(FaceTemplate).filter(FaceTemplate.student_id == student_id).all()
    return [
        {
            "id": t.id,
            "student_id": t.student_id,
            "quality_score": t.quality_score,
            "source_type": t.source_type,
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in templates
    ]

@router.delete("/{student_id}")
def delete_face_templates(student_id: str, db: Session = Depends(get_db)):
    db.query(FaceTemplate).filter(FaceTemplate.student_id == student_id).delete()
    stu = db.query(Student).filter(Student.id == student_id).first()
    if stu:
        stu.face_enrolled = False
        stu.face_sample_count = 0
    db.commit()
    return {"status": "success", "message": "Face templates deleted"}
