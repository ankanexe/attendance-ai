import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models.user import User, Faculty, Student
from models.academic import Subject, Section, StudentSubjectEnrollment
from models.session import ClassSession
from models.attendance import AttendanceRecord, RecognitionEvent
from models.face import FaceTemplate
from models.system import Anomaly, AuditLog, SystemSetting
from services.auth_service import get_password_hash
from ai.embedder import serialize_embedding
from datetime import datetime, date, timedelta
import numpy as np
import random
import uuid

def run_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(User).count() > 0:
        print("[Seed] Database already seeded.")
        db.close()
        return

    print("[Seed] Seeding AttendAI with B.Tech CSE Core 3rd Year real dataset...")

    # 1. System Settings
    settings = [
        SystemSetting(key="match_threshold", value="0.80", description="Cosine similarity threshold for PRESENT/LATE"),
        SystemSetting(key="verify_threshold", value="0.60", description="Threshold range 60-79% for VERIFY required"),
        SystemSetting(key="grace_period_minutes", value="10", description="Default session grace period in minutes"),
        SystemSetting(key="liveness_enabled", value="true", description="Enable motion-based liveness heuristic"),
        SystemSetting(key="camera_default_index", value="0", description="Default webcam device index"),
    ]
    db.add_all(settings)
    db.commit()

    # 2. Faculty User (Primary normal user)
    faculty_user = User(
        id=str(uuid.uuid4()),
        email="faculty@attendai.com",
        hashed_password=get_password_hash("faculty123"),
        role="FACULTY",
        full_name="Dr. Priya Sharma",
        is_active=True
    )
    db.add(faculty_user)
    db.commit()

    # 3. Faculty Profile
    faculty = Faculty(
        id=str(uuid.uuid4()),
        user_id=faculty_user.id,
        department="Computer Science & Engineering (Core)",
        designation="Associate Professor",
        phone="+91 98765 43210"
    )
    db.add(faculty)
    db.commit()

    # 4. Academic Subjects (B.Tech CSE Core 3rd Year)
    subjects_data = [
        ("CS-301", "Artificial Intelligence & Machine Learning", "CSE Core", 3, 4),
        ("CS-302", "Design & Analysis of Algorithms", "CSE Core", 3, 4),
        ("CS-303", "Computer Vision & Biometrics", "CSE Core", 3, 3),
        ("CS-304", "Database Management Systems", "CSE Core", 3, 3),
        ("CS-305", "Operating Systems & Virtualization", "CSE Core", 3, 3),
    ]
    subjects = []
    for code, name, dept, sem, cred in subjects_data:
        sub = Subject(id=str(uuid.uuid4()), code=code, name=name, department=dept, semester=sem, credits=cred)
        subjects.append(sub)
        db.add(sub)
    db.commit()

    # 5. Sections
    sections = []
    for sub in subjects:
        secA = Section(id=str(uuid.uuid4()), subject_id=sub.id, faculty_id=faculty.id, section_name="Section A", room_number="LH-301", student_count=30)
        secB = Section(id=str(uuid.uuid4()), subject_id=sub.id, faculty_id=faculty.id, section_name="Section B", room_number="Lab 4B", student_count=30)
        sections.extend([secA, secB])
        db.add_all([secA, secB])
    db.commit()

    # 6. Real B.Tech CSE Core Students (Lead Student: Ankan Haldar)
    student_roster = [
        ("CSE301", "CS3A-01", "Ankan Haldar", "ankan.haldar@university.edu"),
        ("CSE302", "CS3A-02", "Aarav Mehta", "aarav.mehta@university.edu"),
        ("CSE303", "CS3A-03", "Ananya Iyer", "ananya.iyer@university.edu"),
        ("CSE304", "CS3A-04", "Rohan Verma", "rohan.verma@university.edu"),
        ("CSE305", "CS3A-05", "Diya Mukherjee", "diya.mukherjee@university.edu"),
        ("CSE306", "CS3A-06", "Aditya Nair", "aditya.nair@university.edu"),
        ("CSE307", "CS3A-07", "Ishaan Gupta", "ishaan.gupta@university.edu"),
        ("CSE308", "CS3A-08", "Kavya Patel", "kavya.patel@university.edu"),
        ("CSE309", "CS3A-09", "Aryan Joshi", "aryan.joshi@university.edu"),
        ("CSE310", "CS3A-10", "Sneha Rao", "sneha.rao@university.edu"),
        ("CSE311", "CS3A-11", "Vivaan Sen", "vivaan.sen@university.edu"),
        ("CSE312", "CS3A-12", "Pooja Deshmukh", "pooja.deshmukh@university.edu"),
        ("CSE313", "CS3A-13", "Siddharth Banerjee", "siddharth.b@university.edu"),
        ("CSE314", "CS3A-14", "Tanvi Kulkarni", "tanvi.k@university.edu"),
        ("CSE315", "CS3A-15", "Kabir Bhatia", "kabir.bhatia@university.edu"),
        ("CSE316", "CS3A-16", "Meera Pillai", "meera.pillai@university.edu"),
        ("CSE317", "CS3A-17", "Yash Singhania", "yash.s@university.edu"),
        ("CSE318", "CS3A-18", "Riya Chakraborty", "riya.c@university.edu"),
        ("CSE319", "CS3A-19", "Devendra Roy", "devendra.roy@university.edu"),
        ("CSE320", "CS3A-20", "Shreya Menon", "shreya.menon@university.edu"),
        ("CSE321", "CS3A-21", "Arjun Reddy", "arjun.reddy@university.edu"),
        ("CSE322", "CS3A-22", "Nidhi Saxena", "nidhi.saxena@university.edu"),
        ("CSE323", "CS3A-23", "Manish Tiwari", "manish.tiwari@university.edu"),
        ("CSE324", "CS3A-24", "Simran Kaur", "simran.kaur@university.edu"),
        ("CSE325", "CS3A-25", "Gaurav Agarwal", "gaurav.a@university.edu"),
        ("CSE326", "CS3A-26", "Swati Nambiar", "swati.n@university.edu"),
        ("CSE327", "CS3A-27", "Kunal Ghosh", "kunal.ghosh@university.edu"),
        ("CSE328", "CS3A-28", "Ankita Das", "ankita.das@university.edu"),
        ("CSE329", "CS3A-29", "Varun Hegde", "varun.hegde@university.edu"),
        ("CSE330", "CS3A-30", "Priyanka Mishra", "priyanka.m@university.edu")
    ]

    students = []
    for s_id, roll, name, email in student_roster:
        s = Student(
            id=str(uuid.uuid4()),
            student_id=s_id,
            roll_number=roll,
            full_name=name,
            email=email,
            department="CSE Core",
            semester=3,
            section="Section A",
            status="ACTIVE",
            face_enrolled=False,
            face_sample_count=0
        )
        students.append(s)
        db.add(s)
    db.commit()

    # 7. Pre-seed 3 Face Templates for initial test students
    for idx in range(min(5, len(students))):
        stu = students[idx]
        stu.face_enrolled = True
        stu.face_sample_count = 3
        # Generate 3 distinct simulated angle vectors (Front, Slight Left, Slight Right)
        base_vector = np.random.randn(128).astype(np.float32)
        base_vector /= np.linalg.norm(base_vector)

        for angle_idx, angle_name in enumerate(["01-front", "02-slight-left", "03-slight-right"]):
            angle_noise = np.random.randn(128).astype(np.float32) * 0.05
            angle_vec = base_vector + angle_noise
            angle_vec /= np.linalg.norm(angle_vec)
            
            tmpl = FaceTemplate(
                id=str(uuid.uuid4()),
                student_id=stu.id,
                embedding=serialize_embedding(angle_vec),
                quality_score=0.94,
                source_type=f"WEBCAM_ENROLLMENT_{angle_name}"
            )
            db.add(tmpl)
    db.commit()

    # 8. Student Subject Enrollments
    for stu in students:
        for sub in subjects:
            sec = [s for s in sections if s.subject_id == sub.id and s.section_name == "Section A"][0]
            enrollment = StudentSubjectEnrollment(
                id=str(uuid.uuid4()),
                student_id=stu.id,
                subject_id=sub.id,
                section_id=sec.id
            )
            db.add(enrollment)
    db.commit()

    # 9. Past Completed Sessions (14-day history for CSE Core 3rd Year)
    today = date.today()
    for day_offset in range(14, 0, -1):
        sess_date = today - timedelta(days=day_offset)
        if sess_date.weekday() >= 5:
            continue
        
        sub = subjects[day_offset % len(subjects)]
        sec = [s for s in sections if s.subject_id == sub.id and s.section_name == "Section A"][0]
        
        start_t = datetime.combine(sess_date, datetime.min.time()).replace(hour=9, minute=0)
        end_t = start_t + timedelta(minutes=55)

        sess = ClassSession(
            id=str(uuid.uuid4()),
            subject_id=sub.id,
            section_id=sec.id,
            faculty_id=faculty.id,
            room_number="LH-301",
            session_date=sess_date,
            start_time=start_t,
            end_time=end_t,
            grace_period_minutes=10,
            status="COMPLETED",
            present_count=0,
            late_count=0,
            verify_count=0,
            unknown_count=0,
            total_enrolled=len(students)
        )
        db.add(sess)
        db.commit()

        # Real attendance records per student
        for s in students:
            rand = random.random()
            if rand < 0.85:
                # Present (within 10 min grace period)
                arrive_mins = random.randint(1, 9)
                ts = start_t + timedelta(minutes=arrive_mins, seconds=random.randint(0, 59))
                rec = AttendanceRecord(
                    id=str(uuid.uuid4()),
                    session_id=sess.id,
                    student_id=s.id,
                    timestamp=ts,
                    status="PRESENT",
                    recognition_score=round(random.uniform(0.85, 0.98), 4),
                    is_verified=False,
                    marked_method="AI_CAMERA",
                    ai_recommendation="PRESENT"
                )
                db.add(rec)
                sess.present_count += 1
            elif rand < 0.95:
                # Late (after 10 min grace period)
                arrive_mins = random.randint(11, 25)
                ts = start_t + timedelta(minutes=arrive_mins, seconds=random.randint(0, 59))
                rec = AttendanceRecord(
                    id=str(uuid.uuid4()),
                    session_id=sess.id,
                    student_id=s.id,
                    timestamp=ts,
                    status="LATE",
                    recognition_score=round(random.uniform(0.82, 0.94), 4),
                    is_verified=False,
                    marked_method="AI_CAMERA",
                    ai_recommendation="LATE"
                )
                db.add(rec)
                sess.late_count += 1
            else:
                # Absent
                rec = AttendanceRecord(
                    id=str(uuid.uuid4()),
                    session_id=sess.id,
                    student_id=s.id,
                    timestamp=end_t,
                    status="ABSENT",
                    recognition_score=None,
                    is_verified=False,
                    marked_method="AUTO_ABSENT",
                    ai_recommendation="ABSENT"
                )
                db.add(rec)

        db.commit()

    # 10. Today's Scheduled & Active Classes for immediate live testing
    active_sub = subjects[0]  # CS-301: AI & ML
    active_sec = sections[0]
    active_sess = ClassSession(
        id=str(uuid.uuid4()),
        subject_id=active_sub.id,
        section_id=active_sec.id,
        faculty_id=faculty.id,
        room_number="LH-301",
        session_date=today,
        start_time=datetime.utcnow() - timedelta(minutes=5),
        grace_period_minutes=10,
        status="ACTIVE",
        present_count=0,
        late_count=0,
        verify_count=0,
        unknown_count=0,
        total_enrolled=len(students)
    )
    db.add(active_sess)
    db.commit()

    # 11. Anomalies (Rule-based explainable alerts)
    anomalies = [
        Anomaly(
            id=str(uuid.uuid4()),
            session_id=active_sess.id,
            student_id=students[14].id,
            severity="MEDIUM",
            anomaly_type="UNUSUAL_TIME",
            description=f"{students[14].full_name} arrived 24 mins after class start time.",
            timestamp=datetime.utcnow() - timedelta(hours=2),
            is_resolved=False
        ),
        Anomaly(
            id=str(uuid.uuid4()),
            session_id=active_sess.id,
            student_id=students[20].id,
            severity="HIGH",
            anomaly_type="MULTI_FAILED_ATTEMPT",
            description="3 low-confidence recognition attempts recorded in rapid succession for candidate student.",
            timestamp=datetime.utcnow() - timedelta(hours=4),
            is_resolved=False
        )
    ]
    db.add_all(anomalies)

    # 12. Audit Logs
    audit_logs = [
        AuditLog(
            id=str(uuid.uuid4()),
            user_id=faculty_user.id,
            action="SESSION_START",
            details_json='{"subject": "CS-301", "section": "Section A", "room": "LH-301"}',
            timestamp=datetime.utcnow() - timedelta(minutes=5)
        ),
        AuditLog(
            id=str(uuid.uuid4()),
            user_id=faculty_user.id,
            action="FACE_REGISTERED",
            details_json=f'{{"student_id": "{students[0].student_id}", "student_name": "{students[0].full_name}", "sample_count": 3}}',
            timestamp=datetime.utcnow() - timedelta(hours=1)
        )
    ]
    db.add_all(audit_logs)
    db.commit()

    print("[Seed] Successfully seeded B.Tech CSE Core 3rd Year dataset with Ankan Haldar as lead student!")
    db.close()

if __name__ == "__main__":
    run_seed()
