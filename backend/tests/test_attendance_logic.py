import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from services.attendance_service import determine_status
from services.auth_service import verify_password, get_password_hash, create_access_token
from ai.matcher import cosine_similarity, match_against_templates
import numpy as np

def test_attendance_status_grace_period():
    session_start = datetime(2026, 8, 22, 9, 0, 0)
    grace_period = 10  # 10 minutes

    # Arrival at 9:05 -> PRESENT
    on_time = session_start + timedelta(minutes=5)
    assert determine_status(session_start, on_time, grace_period) == "PRESENT"

    # Arrival at 9:10 exact -> PRESENT
    boundary = session_start + timedelta(minutes=10)
    assert determine_status(session_start, boundary, grace_period) == "PRESENT"

    # Arrival at 9:11 -> LATE
    late_arrival = session_start + timedelta(minutes=11)
    assert determine_status(session_start, late_arrival, grace_period) == "LATE"
    print("  [PASS] test_attendance_status_grace_period")

def test_auth_hashing_and_tokens():
    raw_pw = "faculty123"
    hashed = get_password_hash(raw_pw)
    assert verify_password(raw_pw, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

    token = create_access_token({"user_id": "test-uuid", "role": "FACULTY"})
    assert isinstance(token, str)
    assert len(token) > 20
    print("  [PASS] test_auth_hashing_and_tokens")

def test_cosine_similarity_matching():
    # Identical vectors
    v1 = np.array([1.0, 0.5, -0.5, 0.8], dtype=np.float32)
    assert cosine_similarity(v1, v1) >= 0.999

    # Orthogonal vectors
    v_a = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    v_b = np.array([0.0, 1.0, 0.0, 0.0], dtype=np.float32)
    assert cosine_similarity(v_a, v_b) <= 0.001

    # Template matching thresholds
    templates = [("STU-001", v1)]
    # Perfect match
    match_high = match_against_templates(v1, templates, match_threshold=0.80, verify_threshold=0.60)
    assert match_high.state == "MATCHED"
    assert match_high.student_id == "STU-001"

    # Distant vector -> UNKNOWN
    match_low = match_against_templates(v_b, templates, match_threshold=0.80, verify_threshold=0.60)
    assert match_low.state == "UNKNOWN"
    assert match_low.student_id is None
    print("  [PASS] test_cosine_similarity_matching")

if __name__ == "__main__":
    print("Running AttendAI Unit Tests...")
    test_attendance_status_grace_period()
    test_auth_hashing_and_tokens()
    test_cosine_similarity_matching()
    print("All unit tests passed successfully! [3/3]")
