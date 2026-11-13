# AttendAI — REST & WebSocket API Reference

The AttendAI backend exposes a RESTful API along with a real-time WebSocket connection for live camera recognition streams.

Base URL: `http://localhost:8000/api`
Interactive Swagger Docs: `http://localhost:8000/docs`

---

## 1. Authentication (`/api/auth`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Authenticate with email & password. Returns JWT token and role. |
| `GET` | `/auth/me` | Return current authenticated user profile. |

---

## 2. Students (`/api/students`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/students` | List students with search, filters, pagination, and attendance percentage. |
| `POST` | `/students` | Register a new student. |
| `GET` | `/students/{id}` | Get student detail, enrollment metadata, and attendance history. |
| `PUT` | `/students/{id}` | Update student details. |
| `DELETE` | `/students/{id}` | Remove student record. |

---

## 3. Sessions (`/api/sessions`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/sessions` | List sessions with status filter (`ACTIVE`, `UPCOMING`, `COMPLETED`). |
| `POST` | `/sessions` | Create a new class session with subject, section, room, and grace period. |
| `GET` | `/sessions/{id}` | Get session details including joined subject and section. |
| `PUT` | `/sessions/{id}/start` | Transition session to `ACTIVE` and record start timestamp. |
| `PUT` | `/sessions/{id}/end` | Finalize session as `COMPLETED` and tally attendance. |
| `GET` | `/sessions/{id}/summary` | Get session attendance summary counts (Present, Late, Absent). |

---

## 4. Attendance (`/api/attendance`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/attendance` | List attendance records with date, session, and status filters. |
| `GET` | `/attendance/{id}` | Get detailed attendance record with recognition score and audit notes. |
| `POST` | `/attendance/mark` | Mark student attendance (called by AI camera pipeline). |
| `PUT` | `/attendance/{id}/verify` | Faculty confirmation for ambiguous candidate match (`VERIFY` drawer). |
| `PUT` | `/attendance/{id}/correct` | Faculty manual status override with mandatory audit note. |
| `GET` | `/attendance/session/{id}` | Get all attendance records for a specific session. |

---

## 5. Computer Vision & AI (`/api/ai`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ai/process-frame` | Ingest base64 JPEG video frame, run face detection and matching, dispatch real-time attendance events. |
| `POST` | `/ai/enroll/start` | Initialize 3-angle webcam enrollment wizard for a student. |
| `POST` | `/ai/enroll/capture` | Process enrollment video frame for current angle with quality assessment. |
| `GET` | `/ai/enroll/status/{id}` | Get current enrollment progress (e.g. `2/3 angles completed`). |
| `POST` | `/ai/enroll/finalize` | Commit multi-angle feature vectors to `face_templates` database. |
| `GET` | `/ai/camera/devices` | Enumerate available video capture hardware devices. |
| `POST` | `/ai/camera/test` | Test camera capture and return snapshot frame. |
| `GET` | `/ai/status` | Get AI engine status, enrolled template count, and threshold settings. |

---

## 6. Analytics & Intelligence (`/api/analytics`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/analytics/dashboard` | Real-time KPI summary (Total, Present, Late, Rate, Active Sessions). |
| `GET` | `/analytics/trend` | 30-day historical attendance rate points for area chart. |
| `GET` | `/analytics/by-subject` | Average attendance rate aggregated per subject code. |
| `GET` | `/analytics/low-attendance`| Filter students falling below the 75% attendance threshold. |
| `GET` | `/analytics/forecast/{id}` | Transparent formula-based attendance projection for next 5 classes. |
| `GET` | `/analytics/insights` | Rule-based explainable attendance insights with severity ratings. |

---

## 7. Reports & Compliance (`/api/reports`, `/api/audit-logs`, `/api/anomalies`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/reports/export` | Stream attendance report as downloadable CSV file. |
| `GET` | `/audit-logs` | Retrieve timestamped audit history for faculty and system actions. |
| `GET` | `/anomalies` | List attendance anomalies with severity flags (`LOW`, `MEDIUM`, `HIGH`). |
| `PUT` | `/anomalies/{id}/resolve`| Mark anomaly as resolved by faculty. |

---

## 8. Real-Time WebSocket (`/ws/{session_id}`)

Clients connect to `ws://localhost:8000/ws/{session_id}` to receive real-time JSON events:

```json
// Example: Attendance Marked Event
{
  "type": "attendance_marked",
  "student_id": "STU-2024-001",
  "student_name": "Aarav Mehta",
  "status": "PRESENT",
  "recognition_score": 95.4,
  "attendance_id": "uuid-here"
}

// Example: Ambiguous Candidate (Verify Required)
{
  "type": "recognition_event",
  "student_id": "STU-2024-012",
  "student_name": "Tanvi Kulkarni",
  "status": "VERIFY",
  "result_state": "AMBIGUOUS",
  "recognition_score": 73.8
}
```
