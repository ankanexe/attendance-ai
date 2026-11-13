from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models.system import AuditLog
from models.user import User
from typing import Optional

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])

def serialize_audit(l: AuditLog, db: Session):
    u = db.query(User).filter(User.id == l.user_id).first() if l.user_id else None
    return {
        "id": l.id,
        "user_id": l.user_id,
        "action": l.action,
        "details_json": l.details_json,
        "ip_address": l.ip_address,
        "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        "user": {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value if hasattr(u.role, 'value') else str(u.role)
        } if u else None
    }

@router.get("")
def list_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
    total = query.count()
    items = query.limit(limit).all()

    return {
        "items": [serialize_audit(l, db) for l in items],
        "total": total
    }
