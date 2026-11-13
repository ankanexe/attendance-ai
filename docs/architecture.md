# AttendAI — System Architecture & Design Tokens

## 1. Architectural Philosophy

AttendAI is architected around three foundational pillars:
1. **Local-First Reliability**: The application does not depend on cloud computer vision APIs or internet connectivity to execute attendance. All computer vision inference and database operations happen on-premise.
2. **Light-Mode Stitch Aesthetic**: 100% compliant with the Google Stitch light-mode visual design specifications.
3. **Transparent & Explainable AI**: Every recognition outcome is accompanied by exact similarity scores, timestamps, and bounding box coordinates, allowing faculty oversight at every step.

---

## 2. Component Diagram

```
+-------------------------------------------------------------------------------+
|                             CLIENT LAYER (BROWSER)                            |
|                                                                               |
|  [Next.js 14 App Router + React 18 + Tailwind CSS + Canvas API]              |
|                                                                               |
|  - Faculty Bento Command Center (/dashboard)                                  |
|  - Classroom Mode Video Viewport & Bounding Box Overlay (/live-attendance)   |
|  - 3-Angle Face Registration Wizard (/face-registration)                     |
|  - Analytics & Explainable AI Insights (/analytics, /ai-insights)             |
|  - Mobile-First Student Portal (/student/*)                                   |
|                                                                               |
+-----------------------+-------------------------------+-----------------------+
                        |                               |
              HTTP / REST (JSON)              WebSockets (/ws/{id})
                        |                               |
                        v                               v
+-------------------------------------------------------------------------------+
|                           BACKEND & APPLICATION LAYER                         |
|                                                                               |
|  [FastAPI + Python 3.10+ + Uvicorn Async Server]                              |
|                                                                               |
|  - Authentication & JWT Token Manager (/api/auth)                             |
|  - Session & Timetable Lifecycle Engine (/api/sessions)                       |
|  - Attendance Business Rule Evaluator (Grace Period, Duplicate Suppression)   |
|  - Audit Trail Logger (/api/audit-logs)                                       |
|  - Real-Time WebSocket Broadcaster                                            |
|                                                                               |
+-----------------------+-------------------------------+-----------------------+
                        |                               |
             SQLAlchemy ORM Queries               Frame Stream (Base64 JPEG)
                        |                               |
                        v                               v
+-----------------------------------+   +---------------------------------------+
|          DATABASE LAYER           |   |            AI ENGINE LAYER            |
|                                   |   |                                       |
|  [SQLite Database: attendai.db]   |   |  [OpenCV 5 / MediaPipe / Embedder]   |
|                                   |   |                                       |
|  - 13 Relational Tables           |   |  - Face Detection & Alignment         |
|  - 128D Face Embedding Vectors    |   |  - 128D Feature Extraction            |
|  - Attendance Records & Sessions  |   |  - Vectorized Cosine Matcher          |
|  - Anomalies & Audit Logs         |   |  - Motion Liveness Heuristics         |
+-----------------------------------+   +---------------------------------------+
```

---

## 3. Google Stitch Design System Tokens

AttendAI implements the official Stitch color palette and typographic scale:

| Token Name | Hex Value | Usage |
|---|---|---|
| `primary` | `#3525CD` | Main brand color, active navigation, primary action buttons |
| `primary-container` | `#4F46E5` | Active state accents and highlight badges |
| `secondary` | `#006A61` | Secondary indicators and student directory highlights |
| `background` | `#F8F9FF` | Root background color for all pages |
| `surface` | `#F8F9FF` | Main canvas surface |
| `surface-container-lowest` | `#FFFFFF` | Bento card background |
| `surface-container` | `#E5EEFF` | Table headers, secondary buttons, subtle dividers |
| `surface-container-high` | `#DCE9FF` | Hover states for cards and list items |
| `on-surface` | `#0B1C30` | High-contrast body text and headers |
| `on-surface-variant` | `#464555` | Secondary text, captions, and icon labels |
| `outline-variant` | `#C7C4D8` | Border color for cards, inputs, and tables (1px solid) |
| `error` | `#BA1A1A` | Absent tags, high-severity anomalies, delete actions |
| `error-container` | `#FFDAD6` | Error notification banners |

### Bento Card Guidelines
- **Corner Radius**: `rounded-3xl` (`1.5rem` / `24px`).
- **Border**: `1px solid #C7C4D8`.
- **Background**: `#FFFFFF`.
- **Shadow**: `0px 2px 12px rgba(0, 0, 0, 0.04)`.
- **Padding**: `1.5rem` (`24px`).
