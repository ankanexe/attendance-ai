# AttendAI — Intelligent Attendance. Smarter Classrooms.

AttendAI is a production-grade, local-first artificial intelligence attendance management platform built for modern university classrooms. It utilizes real-time computer vision and facial recognition to eliminate proxy attendance and manual roll calls while keeping faculty in complete control through explainable AI and human-in-the-loop verification.

---

## 🌟 Key Features

- **100% Light Mode UI**: Faithfully styled with Google Stitch design tokens (`#3525CD` primary, `#F8F9FF` background, `#FFFFFF` surface, 24px rounded bento cards).
- **Real-Time Computer Vision**: Live webcam video stream with bounding boxes, facial sharpness/quality assessment, 128D feature embedding extraction, and cosine similarity matching.
- **Human-in-the-Loop Verification**: Ambiguous recognition (60%–79% confidence) triggers an interactive `[VERIFY]` drawer with side-by-side comparison.
- **Robust University Attendance Logic**:
  - Exact timestamp recording with second-level precision.
  - Configurable grace period (e.g. within 10 mins = `PRESENT`, after 10 mins = `LATE`).
  - Duplicate detection ("Already marked at 09:14:23 AM").
  - Unknown face detection and logging.
- **Multi-Angle Biometric Enrollment**: 3-step webcam enrollment wizard (Front, Left 15°, Right 15°) storing mathematical embeddings locally.
- **Analytics & Forecasting**: 30-day attendance trend charts, subject performance distributions, low-attendance alerts (< 75%), and transparent formula-based attendance projection.
- **Mobile-First Student Portal**: Dedicated student portal with circular progress tracker, attendance history, and warning alerts.
- **Export & Compliance**: Instant CSV report generation and immutable compliance audit logs.

---

## 🏗️ Architecture

```
                      +--------------------------------------------------+
                      |               Browser (Next.js UI)               |
                      |   - Light Mode Stitch UI & Bento Dashboards      |
                      |   - WebRTC / Camera Video Stream Canvas          |
                      |   - Real-time WebSocket Client for Events        |
                      +-------------------------+------------------------+
                                                | HTTP / WebSocket
                                                v
                      +--------------------------------------------------+
                      |             FastAPI Backend Service              |
                      |   - Session & Timetable Management               |
                      |   - Attendance Decision Engine (Grace, Dups)     |
                      |   - Role-Based Auth (Faculty, Student, Admin)    |
                      |   - Audit Logging & Analytics Calculation        |
                      +------------+------------------------+------------+
                                   |                        |
                   Embeddings / SQL|                        | Frame Stream
                                   v                        v
                      +------------------------+ +-----------------------+
                      |   SQLite Database      | |   Python AI Engine    |
                      |  - Students & Faculty  | |  - OpenCV Video Capture|
                      |  - Face Templates      | |  - Face Detection     |
                      |  - Sessions & Records  | |  - Deep Embedding Gen |
                      |  - Anomalies & Audits  | |  - Cosine Similarity  |
                      |  - System Settings     | |  - Liveness Heuristics|
                      +------------------------+ +-----------------------+
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- Built-in or USB webcam

### 2. Start Backend Server
```powershell
# Double click start_backend.bat or run:
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- Backend API: `http://localhost:8000`
- Interactive Swagger API Docs: `http://localhost:8000/docs`

### 3. Start Frontend UI
```powershell
# Double click start_frontend.bat or run:
cd frontend
npm run dev
```
- Web Application: `http://localhost:3000`

---

## 🔑 Demo Login Credentials

The database is pre-seeded with realistic university data. Use any of the following credentials or the one-click quick login pills on `/login`:

| Role | Email | Password | Access |
|---|---|---|---|
| **Faculty** | `faculty@attendai.com` | `faculty123` | Full Dashboard, Classroom Mode, Face Registration, Verification Drawer |
| **Student** | `student@attendai.com` | `student123` | Mobile-first Student Portal, Personal Attendance, Warning Alert |
| **Admin** | `admin@attendai.com` | `admin123` | System Settings, User Management, Audit Trail |

---

## 📂 Project Structure

```
attendance ai/
├── backend/
│   ├── main.py                  # FastAPI application entrypoint & WebSocket handler
│   ├── config.py                # JWT, database, and AI threshold settings
│   ├── database.py              # SQLAlchemy engine & session factory
│   ├── ai/                      # Computer Vision AI Engine
│   │   ├── detector.py          # Multi-face detection (OpenCV / face_recognition)
│   │   ├── embedder.py          # 128D feature embedding extraction & normalization
│   │   ├── matcher.py           # Vectorized cosine similarity matching
│   │   ├── quality.py           # Sharpness, pose, and size quality assessment
│   │   ├── liveness.py          # Motion & blink heuristic liveness analysis
│   │   ├── enrollment.py        # 3-angle face registration session manager
│   │   ├── face_engine.py       # Main AI orchestrator
│   │   └── router.py            # FastAPI AI endpoints (/api/ai/*)
│   ├── models/                  # SQLAlchemy ORM Models (13 entities)
│   ├── routers/                 # REST API Routers (Auth, Students, Sessions, Attendance, Analytics, etc.)
│   ├── services/                # Business logic (Grace period, duplicate prevention, auth)
│   ├── websocket/               # Real-time WebSocket connection manager
│   └── seed/                    # Database seeder with realistic university demo data
├── frontend/
│   ├── app/                     # Next.js 14 App Router
│   │   ├── (auth)/login/        # Split-screen login with demo credentials
│   │   ├── (faculty)/           # Faculty portal layout & routes
│   │   │   ├── dashboard/       # Bento command center & charts
│   │   │   ├── live-attendance/ # Classroom Mode with webcam & bounding boxes
│   │   │   ├── camera-setup/    # Diagnostics & live feed preview
│   │   │   ├── session-setup/   # Start class session wizard
│   │   │   ├── face-registration/# 3-step webcam enrollment wizard
│   │   │   ├── students/        # Student directory & profile views
│   │   │   ├── subjects/        # Course management
│   │   │   ├── sessions/        # Session timetable & history
│   │   │   ├── attendance/      # Master ledger & manual override drawer
│   │   │   ├── analytics/       # Attendance trends & forecast calculator
│   │   │   ├── ai-insights/     # Explainable rule-based intelligence
│   │   │   ├── recognition-logs/# Raw CV event stream
│   │   │   ├── anomalies/       # Attendance irregularity alerts
│   │   │   ├── reports/         # CSV export center
│   │   │   ├── audit-logs/      # Compliance audit trail
│   │   │   └── settings/        # System & integration settings
│   │   └── student/             # Mobile-first Student Portal
│   ├── components/              # UI components (BentoCard, MetricCard, CameraView, etc.)
│   └── lib/                     # API client, Auth context, utilities
├── docs/                        # Complete technical documentation suite
├── start_backend.bat            # One-click backend launcher
└── start_frontend.bat           # One-click frontend launcher
```

---

## 🔒 Privacy & Compliance

- **Mathematical Vectors Only**: AttendAI never permanently stores raw facial images. All biometric data is converted to 128-dimensional floating-point vectors.
- **Local-First Processing**: All computer vision inference and database storage occurs locally on the server without sending biometric data to third-party cloud APIs.
- **Audit Logging**: Every manual correction, verification decision, and session event is recorded with an immutable timestamp and faculty ID.

---

## 📜 License & Academic Attribution
Developed as an AI / Computer Science PBL project (3rd-year B.Tech).
AttendAI © 2026. All rights reserved.
