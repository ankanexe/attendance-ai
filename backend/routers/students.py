from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models.user import Student
from models.academic import Subject, Section, StudentSubjectEnrollment
from models.attendance import AttendanceRecord
from models.session import ClassSession
from schemas.student import StudentCreate, StudentResponse
from typing import List, Optional, Dict, Any
import csv
import io
import uuid

router = APIRouter(prefix="/api/students", tags=["students"])

@router.get("")
def get_students(
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    semester: Optional[int] = Query(None),
    section: Optional[str] = Query(None),
    subject_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                Student.full_name.ilike(s_term),
                Student.student_id.ilike(s_term),
                Student.roll_number.ilike(s_term),
                Student.email.ilike(s_term)
            )
        )
    if department:
        query = query.filter(Student.department == department)
    if semester:
        query = query.filter(Student.semester == semester)
    if section:
        query = query.filter(Student.section == section)

    total = query.count()
    students = query.offset((page - 1) * limit).limit(limit).all()

    items = []
    for s in students:
        records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == s.id).order_by(AttendanceRecord.timestamp.desc()).all()
        total_rec = len(records)
        attended_rec = sum(1 for r in records if r.status in ["PRESENT", "LATE"])
        att_pct = (attended_rec / max(1, total_rec) * 100) if total_rec > 0 else 0.0

        # Last attendance
        last_rec = records[0] if records else None
        last_att_str = last_rec.timestamp.strftime("%d %b %Y, %I:%M %p") if (last_rec and last_rec.timestamp) else "—"

        # Subject-specific attendance if subject_id passed
        sub_pct = None
        if subject_id:
            sub_records = [r for r in records if r.session and r.session.subject_id == subject_id]
            if sub_records:
                sub_att = sum(1 for r in sub_records if r.status in ["PRESENT", "LATE"])
                sub_pct = round((sub_att / len(sub_records)) * 100, 1)

        items.append({
            "id": s.id,
            "student_id": s.student_id,
            "roll_number": s.roll_number,
            "full_name": s.full_name,
            "email": s.email,
            "department": s.department,
            "semester": s.semester,
            "section": s.section,
            "status": s.status,
            "face_enrolled": s.face_enrolled,
            "face_sample_count": s.face_sample_count,
            "overall_attendance": round(att_pct, 1),
            "subject_attendance": sub_pct,
            "last_attendance": last_att_str,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.get("/{id}")
def get_student(id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Fetch all attendance records
    records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).order_by(AttendanceRecord.timestamp.desc()).all()
    total_classes = len(records)
    attended_count = sum(1 for r in records if r.status == "PRESENT")
    late_count = sum(1 for r in records if r.status == "LATE")
    missed_count = sum(1 for r in records if r.status == "ABSENT")
    present_or_late = attended_count + late_count
    overall_rate = (present_or_late / max(1, total_classes) * 100) if total_classes > 0 else 0.0

    # Calculate subject-wise attendance
    subjects = db.query(Subject).all()
    subject_breakdown = []
    
    for sub in subjects:
        sub_records = db.query(AttendanceRecord).join(ClassSession).filter(
            AttendanceRecord.student_id == student.id,
            ClassSession.subject_id == sub.id
        ).all()
        
        sub_total = len(sub_records)
        sub_attended = sum(1 for r in sub_records if r.status in ["PRESENT", "LATE"])
        sub_rate = round((sub_attended / max(1, sub_total)) * 100, 1) if sub_total > 0 else 0.0
        
        subject_breakdown.append({
            "subject_id": sub.id,
            "subject_code": sub.code,
            "subject_name": sub.name,
            "total_classes": sub_total,
            "attended": sub_attended,
            "missed": sub_total - sub_attended,
            "attendance_rate": sub_rate
        })

    last_record = records[0] if records else None

    return {
        "id": student.id,
        "student_id": student.student_id,
        "roll_number": student.roll_number,
        "full_name": student.full_name,
        "email": student.email,
        "department": student.department,
        "semester": student.semester,
        "section": student.section,
        "status": student.status,
        "face_enrolled": student.face_enrolled,
        "face_sample_count": student.face_sample_count,
        "overall_attendance": round(overall_rate, 1),
        "total_classes": total_classes,
        "classes_attended": attended_count,
        "classes_late": late_count,
        "classes_missed": missed_count,
        "last_attendance": {
            "date_time": last_record.timestamp.strftime("%d %b %Y, %I:%M:%S %p") if last_record and last_record.timestamp else None,
            "status": last_record.status if last_record else None,
            "score": round(last_record.recognition_score * 100, 1) if (last_record and last_record.recognition_score) else None
        } if last_record else None,
        "subject_breakdown": subject_breakdown,
        "recent_records": [
            {
                "id": r.id,
                "session_id": r.session_id,
                "timestamp": r.timestamp.strftime("%d %b %Y, %I:%M:%S %p") if r.timestamp else "—",
                "status": r.status,
                "score": round(r.recognition_score * 100, 1) if r.recognition_score is not None else None,
                "is_verified": r.is_verified,
                "marked_method": r.marked_method
            }
            for r in records[:20]
        ]
    }

@router.post("")
def create_student(student: StudentCreate, db: Session = Depends(get_db)):
    existing = db.query(Student).filter(Student.student_id == student.student_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Student ID '{student.student_id}' already exists")

    new_student = Student(**student.dict())
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

@router.post("/import-csv")
async def import_students_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Import students from CSV file.
    Expected columns: Student ID, Name, Roll Number, Email, Department, Semester, Section
    """
    contents = await file.read()
    decoded = contents.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))
    
    imported_count = 0
    skipped_count = 0
    errors = []

    for row_idx, row in enumerate(reader, start=2):
        s_id = row.get("Student ID") or row.get("student_id")
        name = row.get("Name") or row.get("full_name") or row.get("Student Name")
        roll = row.get("Roll Number") or row.get("roll_number") or ""
        email = row.get("Email") or row.get("email") or ""
        dept = row.get("Department") or row.get("department") or "CSE"
        sem = int(row.get("Semester") or row.get("semester") or 3)
        sec = row.get("Section") or row.get("section") or "Section A"

        if not s_id or not name:
            errors.append(f"Row {row_idx}: Missing required Student ID or Name")
            skipped_count += 1
            continue

        existing = db.query(Student).filter(Student.student_id == s_id).first()
        if existing:
            skipped_count += 1
            continue

        new_stu = Student(
            id=str(uuid.uuid4()),
            student_id=s_id.strip(),
            roll_number=roll.strip(),
            full_name=name.strip(),
            email=email.strip() or f"{s_id.lower()}@university.edu",
            department=dept.strip(),
            semester=sem,
            section=sec.strip(),
            status="ACTIVE",
            face_enrolled=False,
            face_sample_count=0
        )
        db.add(new_stu)
        imported_count += 1

    db.commit()
    return {
        "imported_count": imported_count,
        "skipped_duplicates_count": skipped_count,
        "errors": errors
    }

@router.put("/{id}")
def update_student(id: str, student_data: StudentCreate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for key, value in student_data.dict().items():
        setattr(student, key, value)
    db.commit()
    db.refresh(student)
    return student

@router.delete("/{id}")
def delete_student(id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return {"status": "ok"}
