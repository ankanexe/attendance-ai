# AttendAI — Biometric Privacy, Security & Compliance

AttendAI is engineered to comply with academic data protection standards and ethical biometric principles.

---

## 1. Biometric Data Protection Principles

### 1. Zero Permanent Facial Image Storage
- Raw facial images from camera streams or photo registrations are **never permanently stored** on disk or in the database.
- During registration, face images are processed in-memory to extract mathematical 128-dimensional floating-point vectors ($\mathbb{R}^{128}$).
- Once the embedding is generated and normalized, the pixel data is immediately garbage-collected from RAM.
- **Non-Reversible Representation**: 128D mathematical vectors cannot be reconstructed back into the original facial photograph.

### 2. Local-First Processing
- No biometric data, embeddings, or video frames are transmitted to external third-party cloud APIs (such as AWS Rekognition or Azure Face API).
- All inference executes on the institution's local hardware or dedicated private server.

### 3. Purpose Limitation & Access Control
- Biometric templates are strictly used for **classroom attendance verification**.
- Access to the attendance system requires role-based authentication (Faculty, Admin, Student).
- Students can only view their own attendance records and cannot access other students' biometric or attendance data.

---

## 2. Compliance & Auditability

1. **Immutable Audit Trail**: Every faculty action, including manual attendance corrections, verification drawer decisions, and session starts, is logged in `audit_logs` with the faculty ID, timestamp, and explanation note.
2. **Right to Erasure (Template Deletion)**: Students or administrators can permanently delete enrolled face templates at any time via `DELETE /api/face/{student_id}`. Once deleted, the student's status reverts to `Not Enrolled`, requiring manual attendance until re-enrolled.
3. **Transparent Explainable AI**: The system provides clear confidence scores, transparent formulas, and human-in-the-loop overrides rather than black-box decisions.
