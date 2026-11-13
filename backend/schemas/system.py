from pydantic import BaseModel
from datetime import datetime

class AnomalyResponse(BaseModel):
    id: str
    severity: str
    anomaly_type: str
    description: str
    timestamp: datetime
    is_resolved: bool
    class Config:
        from_attributes = True
