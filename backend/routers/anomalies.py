from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models.system import Anomaly
from models.user import Student
from typing import Optional

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"])

def serialize_anomaly(a: Anomaly, db: Session):
    stu = db.query(Student).filter(Student.id == a.student_id).first() if a.student_id else None
    return {
        "id": a.id,
        "session_id": a.session_id,
        "student_id": a.student_id,
        "severity": a.severity,
        "anomaly_type": a.anomaly_type,
        "description": a.description,
        "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        "is_resolved": a.is_resolved,
        "resolved_by": a.resolved_by,
        "student": {
            "id": stu.id,
            "full_name": stu.full_name,
            "student_id": stu.student_id,
            "roll_number": stu.roll_number
        } if stu else None
    }

@router.get("")
def list_anomalies(
    severity: Optional[str] = Query(None),
    is_resolved: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Anomaly).order_by(Anomaly.timestamp.desc())
    if severity:
        query = query.filter(Anomaly.severity == severity)
    if is_resolved is not None:
        query = query.filter(Anomaly.is_resolved == is_resolved)

    total = query.count()
    items = query.limit(limit).all()

    return {
        "items": [serialize_anomaly(a, db) for a in items],
        "total": total
    }

@router.put("/{id}/resolve")
def resolve_anomaly(id: str, db: Session = Depends(get_db)):
    anomaly = db.query(Anomaly).filter(Anomaly.id == id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    anomaly.is_resolved = True
    anomaly.resolved_by = "Dr. Priya Sharma"
    db.commit()
    db.refresh(anomaly)
    return serialize_anomaly(anomaly, db)
