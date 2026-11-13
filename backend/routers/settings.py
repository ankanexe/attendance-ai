from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from database import get_db
from models.system import SystemSetting
from typing import List, Dict, Any

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("")
def list_settings(db: Session = Depends(get_db)):
    settings = db.query(SystemSetting).all()
    return [
        {
            "id": s.id,
            "key": s.key,
            "value": s.value,
            "description": s.description,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None
        }
        for s in settings
    ]

@router.put("/{key}")
def update_setting(key: str, body: dict = Body(...), db: Session = Depends(get_db)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    new_val = str(body.get("value", ""))
    if not setting:
        setting = SystemSetting(key=key, value=new_val)
        db.add(setting)
    else:
        setting.value = new_val
    db.commit()
    db.refresh(setting)
    return {
        "id": setting.id,
        "key": setting.key,
        "value": setting.value,
        "description": setting.description
    }
