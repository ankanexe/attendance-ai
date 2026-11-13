from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import Faculty, User
from typing import List

router = APIRouter(prefix="/api/faculty", tags=["faculty"])

@router.get("")
def list_faculty(db: Session = Depends(get_db)):
    faculty = db.query(Faculty).all()
    res = []
    for f in faculty:
        u = db.query(User).filter(User.id == f.user_id).first()
        res.append({
            "id": f.id,
            "user_id": f.user_id,
            "department": f.department,
            "designation": f.designation,
            "phone": f.phone,
            "user": {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email
            } if u else None
        })
    return res
