from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from contextlib import asynccontextmanager
from seed.seed_demo import run_seed
from websocket.manager import manager

# Routers
from routers.auth import router as auth_router
from routers.students import router as students_router
from routers.sessions import router as sessions_router
from routers.attendance import router as attendance_router
from routers.analytics import router as analytics_router
from routers.faculty import router as faculty_router
from routers.subjects import router as subjects_router
from routers.sections import router as sections_router
from routers.face import router as face_router
from routers.reports import router as reports_router
from routers.recognition_logs import router as rec_router
from routers.anomalies import router as anomalies_router
from routers.audit_logs import router as audit_router
from routers.settings import router as settings_router
from ai.router import router as ai_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        run_seed()
    except Exception as e:
        print(f"[Lifespan] Seed notice: {e}")
    yield

app = FastAPI(title="AttendAI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(students_router)
app.include_router(sessions_router)
app.include_router(attendance_router)
app.include_router(analytics_router)
app.include_router(faculty_router)
app.include_router(subjects_router)
app.include_router(sections_router)
app.include_router(face_router)
app.include_router(reports_router)
app.include_router(rec_router)
app.include_router(anomalies_router)
app.include_router(audit_router)
app.include_router(settings_router)
app.include_router(ai_router)

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            pass
    except Exception:
        manager.disconnect(websocket, session_id)

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0", "engine": "online"}
