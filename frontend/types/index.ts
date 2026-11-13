// Core entity types matching backend models

export type Role = 'FACULTY' | 'ADMIN';
export type StudentStatus = 'ACTIVE' | 'INACTIVE';
export type SessionStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'VERIFY' | 'ABSENT';
export type RecognitionState = 'MATCHED' | 'AMBIGUOUS' | 'UNKNOWN' | 'NOT_IN_SESSION';
export type MarkedMethod = 'AI_CAMERA' | 'FACULTY_MANUAL' | 'VERIFY_CONFIRMED' | 'AUTO_ABSENT';
export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AnomalyType = 'OUTSIDE_SESSION' | 'MULTI_FAILED_ATTEMPT' | 'UNUSUAL_TIME' | 'RAPID_REAPPEARANCE';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Faculty {
  id: string;
  user_id: string;
  department: string;
  designation: string;
  phone?: string;
  user?: User;
}

export interface Student {
  id: string;
  student_id: string;
  roll_number: string;
  full_name: string;
  email: string;
  department: string;
  semester: number;
  section: string;
  status: StudentStatus;
  face_enrolled: boolean;
  face_sample_count: number;
  user_id?: string;
  created_at: string;
  updated_at: string;
  overall_attendance?: number;
  subject_attendance?: number | null;
  last_attendance?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
}

export interface Section {
  id: string;
  subject_id: string;
  faculty_id: string;
  section_name: string;
  room_number?: string;
  student_count: number;
  subject?: Subject;
  faculty?: Faculty;
}

export interface ClassSession {
  id: string;
  subject_id: string;
  section_id: string;
  faculty_id: string;
  room_number?: string;
  session_date: string;
  start_time?: string;
  end_time?: string;
  grace_period_minutes: number;
  status: SessionStatus;
  present_count: number;
  late_count: number;
  verify_count: number;
  unknown_count: number;
  total_enrolled: number;
  created_at: string;
  subject?: Subject;
  section?: Section;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  timestamp: string;
  status: AttendanceStatus;
  recognition_score?: number;
  liveness_score?: number;
  is_verified: boolean;
  verified_by_faculty_id?: string;
  verification_timestamp?: string;
  verification_note?: string;
  ai_recommendation?: AttendanceStatus;
  marked_method: MarkedMethod;
  student?: Student;
  session?: ClassSession;
}

export interface RecognitionEvent {
  id: string;
  session_id: string;
  timestamp: string;
  bounding_box?: string;
  candidate_student_id?: string;
  recognition_score?: number;
  result_state: RecognitionState;
  snapshot_path?: string;
  candidate_student?: Student;
}

export interface FaceTemplate {
  id: string;
  student_id: string;
  quality_score?: number;
  source_type: string;
  created_at: string;
}

export interface Anomaly {
  id: string;
  session_id?: string;
  student_id?: string;
  severity: AnomalySeverity;
  anomaly_type: AnomalyType;
  description: string;
  timestamp: string;
  is_resolved: boolean;
  resolved_by?: string;
  student?: Student;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details_json?: string;
  ip_address?: string;
  timestamp: string;
  user?: User;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

// Analytics types
export interface DashboardStats {
  total_students: number;
  present_today: number;
  late_today: number;
  absent_today: number;
  attendance_rate_today: number;
  active_sessions: number;
  unknown_faces_today: number;
  verify_pending: number;
}

export interface AttendanceTrendPoint {
  date: string;
  attendance_rate: number;
  present: number;
  late: number;
  absent: number;
}

export interface SubjectAnalytics {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  attendance_rate: number;
  total_sessions: number;
}

export interface LowAttendanceStudent {
  student_id: string;
  student_name: string;
  roll_number: string;
  attendance_percentage: number;
  subject_code: string;
  subject_name: string;
}

export interface AIInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: AnomalySeverity;
  metric?: string | number;
  created_at: string;
}

// Recognition result from AI engine
export interface RecognitionResult {
  bounding_box: number[];
  student_id: string | null;
  recognition_score: number;
  state: RecognitionState;
  quality_score: number;
  liveness_confident: boolean;
  feedback: string;
  /** 5 facial landmark keypoints [[x,y], ...] — left_eye, right_eye, nose, mouth_l, mouth_r */
  landmarks?: number[][];
}

// Session Attendance Detail ("Who Attended")
export interface SessionAttendee {
  student_id: string;
  university_id: string;
  roll_number: string;
  full_name: string;
  email: string;
  status: AttendanceStatus;
  time: string;
  score: number | null;
  minutes_late: number;
  is_verified: boolean;
  verification_note?: string;
  marked_method: string;
}

export interface UnknownAttendeeEvent {
  id: string;
  timestamp: string;
  score: number;
  result_state: string;
  bounding_box?: string;
}

export interface SessionAttendanceDetail {
  session: ClassSession;
  counts: {
    enrolled: number;
    present: number;
    late: number;
    absent: number;
    verify: number;
    unknown: number;
  };
  rosters: {
    all: SessionAttendee[];
    present: SessionAttendee[];
    late: SessionAttendee[];
    absent: SessionAttendee[];
    verify: SessionAttendee[];
    unknown: UnknownAttendeeEvent[];
  };
}

// Student Detailed Profile Dossier
export interface StudentSubjectBreakdown {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  total_classes: number;
  attended: number;
  missed: number;
  attendance_rate: number;
}

export interface StudentDossier {
  id: string;
  student_id: string;
  roll_number: string;
  full_name: string;
  email: string;
  department: string;
  semester: number;
  section: string;
  status: StudentStatus;
  face_enrolled: boolean;
  face_sample_count: number;
  overall_attendance: number;
  total_classes: number;
  classes_attended: number;
  classes_late: number;
  classes_missed: number;
  last_attendance: {
    date_time: string | null;
    status: AttendanceStatus | null;
    score: number | null;
  } | null;
  subject_breakdown: StudentSubjectBreakdown[];
  recent_records: {
    id: string;
    session_id: string;
    timestamp: string;
    status: AttendanceStatus;
    score: number | null;
    is_verified: boolean;
    marked_method: string;
  }[];
}

// API paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: Role;
}
