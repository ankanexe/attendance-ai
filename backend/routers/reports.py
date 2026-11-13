from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from database import get_db
from models.attendance import AttendanceRecord
from models.session import ClassSession
from models.user import Student
from models.academic import Subject
from typing import Optional
import io
import csv

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/export")
def export_reports(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    report_type: Optional[str] = Query("daily"),
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceRecord).order_by(AttendanceRecord.timestamp.desc())
    records = query.all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Record ID",
        "Student ID",
        "Student Name",
        "Roll Number",
        "Subject Code",
        "Subject Name",
        "Session Date",
        "Timestamp",
        "Attendance Status",
        "Recognition Score (%)",
        "Marked Method",
        "Verified by Faculty"
    ])

    for r in records:
        stu = db.query(Student).filter(Student.id == r.student_id).first()
        sess = db.query(ClassSession).filter(ClassSession.id == r.session_id).first()
        sub = db.query(Subject).filter(Subject.id == sess.subject_id).first() if sess else None

        score_str = f"{(r.recognition_score * 100):.1f}%" if r.recognition_score is not None else "N/A"
        writer.writerow([
            r.id,
            stu.student_id if stu else "N/A",
            stu.full_name if stu else "Unknown",
            stu.roll_number if stu else "N/A",
            sub.code if sub else "N/A",
            sub.name if sub else "N/A",
            sess.session_date.isoformat() if sess and sess.session_date else "N/A",
            r.timestamp.isoformat() if r.timestamp else "N/A",
            r.status,
            score_str,
            r.marked_method or "AI_CAMERA",
            "Yes" if r.is_verified else "No"
        ])

    csv_data = output.getvalue()
    output.close()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=attendai_{report_type}_report.csv"
        }
    )
