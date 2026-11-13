# AttendAI — Database Schema & Data Models

AttendAI uses SQLite (`attendai.db`) through SQLAlchemy ORM with a clean separation of concerns for easy future PostgreSQL migration.

---

## 1. Entity Relationship Overview

- **`users`** $\to$ **`faculty`** (1-to-1)
- **`users`** $\to$ **`students`** (1-to-1 optional)
- **`subjects`** $\to$ **`sections`** (1-to-Many)
- **`sections`** $\to$ **`class_sessions`** (1-to-Many)
- **`class_sessions`** $\to$ **`attendance_records`** (1-to-Many)
- **`students`** $\to$ **`attendance_records`** (1-to-Many)
- **`students`** $\to$ **`face_templates`** (1-to-Many)
- **`users`** $\to$ **`audit_logs`** (1-to-Many)

---

## 2. Table Schemas

### `users`
| Column | Type | Description |
|---|---|---|
| `id` | String (UUID PK) | Unique user identifier |
| `email` | String (Unique) | User login email |
| `hashed_password` | String | PBKDF2/Bcrypt password hash |
| `role` | Enum (`FACULTY`, `STUDENT`, `ADMIN`) | Access level |
| `full_name` | String | Full name |
| `is_active` | Boolean | Account active flag |
| `created_at` | DateTime | Account creation timestamp |

### `students`
| Column | Type | Description |
|---|---|---|
| `id` | String (UUID PK) | Unique student identifier |
| `student_id` | String (Unique) | University ID (e.g. `STU-2024-001`) |
| `roll_number` | String | Roll number (e.g. `CS3A-01`) |
| `full_name` | String | Student full name |
| `email` | String | Email address |
| `department` | String | Academic department (e.g. `CSE`) |
| `semester` | Integer | Current semester (1–8) |
| `section` | String | Assigned section (e.g. `Section A`) |
| `status` | String | `ACTIVE` / `INACTIVE` |
| `face_enrolled` | Boolean | Biometric registration status |
| `face_sample_count`| Integer | Count of registered angle embeddings |
| `user_id` | String (FK `users.id`) | Optional portal account linkage |

### `face_templates`
| Column | Type | Description |
|---|---|---|
| `id` | String (UUID PK) | Template identifier |
| `student_id` | String (FK `students.id`) | Enrolled student reference |
| `embedding` | Text (Base64) | 128D float32 normalized feature vector |
| `quality_score` | Float | Sharpness/pose quality rating (0.0–1.0) |
| `source_type` | String | `WEBCAM_ENROLLMENT` / `PHOTO_BATCH` |
| `created_at` | DateTime | Enrollment timestamp |

### `class_sessions`
| Column | Type | Description |
|---|---|---|
| `id` | String (UUID PK) | Class session identifier |
| `subject_id` | String (FK `subjects.id`) | Enrolled subject reference |
| `section_id` | String (FK `sections.id`) | Target section reference |
| `faculty_id` | String (FK `faculty.id`) | Instructor reference |
| `room_number` | String | Classroom / Lab number |
| `session_date` | Date | Scheduled date |
| `start_time` | DateTime | Actual start timestamp |
| `end_time` | DateTime | Actual conclusion timestamp |
| `grace_period_minutes` | Integer | Configured grace period (default 10) |
| `status` | String | `UPCOMING`, `ACTIVE`, `COMPLETED`, `CANCELLED` |
| `present_count` | Integer | Total present tally |
| `late_count` | Integer | Total late tally |
| `verify_count` | Integer | Total verify tally |
| `total_enrolled` | Integer | Total registered students in section |

### `attendance_records`
| Column | Type | Description |
|---|---|---|
| `id` | String (UUID PK) | Attendance record identifier |
| `session_id` | String (FK `class_sessions.id`) | Session reference |
| `student_id` | String (FK `students.id`) | Student reference |
| `timestamp` | DateTime | Second-level exact arrival timestamp |
| `status` | String | `PRESENT`, `LATE`, `VERIFY`, `ABSENT` |
| `recognition_score` | Float | AI confidence score (0.0–1.0) |
| `is_verified` | Boolean | True if confirmed by faculty |
| `verified_by_faculty_id` | String (FK `faculty.id`) | Faculty who confirmed |
| `verification_note` | String | Audit note explaining verification/override |
| `marked_method` | String | `AI_CAMERA`, `FACULTY_MANUAL`, `VERIFY_CONFIRMED` |

### `anomalies`
| Column | Type | Description |
|---|---|---|
| `id` | String (UUID PK) | Anomaly identifier |
| `session_id` | String (Nullable) | Associated session |
| `student_id` | String (Nullable) | Associated student |
| `severity` | String | `LOW`, `MEDIUM`, `HIGH` |
| `anomaly_type` | String | `OUTSIDE_SESSION`, `MULTI_FAILED_ATTEMPT`, `UNUSUAL_TIME` |
| `description` | String | Human-readable explanation of the anomaly |
| `timestamp` | DateTime | Occurrence timestamp |
| `is_resolved` | Boolean | Resolution flag |
| `resolved_by` | String | Faculty who resolved |

### `audit_logs`
| Column | Type | Description |
|---|---|---|
| `id` | String (UUID PK) | Audit record identifier |
| `user_id` | String (FK `users.id`) | User who performed action |
| `action` | String | `LOGIN`, `SESSION_START`, `MANUAL_CORRECTION`, etc. |
| `details_json` | Text (JSON) | Action payload metadata |
| `timestamp` | DateTime | Timestamp |
