import axios from 'axios';
import type {
  LoginRequest, AuthResponse, User, Student, Subject, Section,
  ClassSession, AttendanceRecord, RecognitionEvent, FaceTemplate,
  Anomaly, AuditLog, SystemSetting, DashboardStats, AttendanceTrendPoint,
  SubjectAnalytics, LowAttendanceStudent, AIInsight, PaginatedResponse,
  SessionAttendanceDetail, StudentDossier
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({ baseURL: API_BASE });

// Attach JWT
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('attendai_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('attendai_token');
      localStorage.removeItem('attendai_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  login: (data: LoginRequest) => apiClient.post<AuthResponse>('/auth/login', data),
  getMe: () => apiClient.get<User>('/auth/me'),
};

// Students
export const studentsAPI = {
  list: (params?: Record<string, unknown>) => apiClient.get<PaginatedResponse<Student>>('/students', { params }),
  get: (id: string) => apiClient.get<Student>(`/students/${id}`),
  getDetail: (id: string) => apiClient.get<StudentDossier>(`/students/${id}`),
  create: (data: Partial<Student>) => apiClient.post<Student>('/students', data),
  importCSV: (formData: FormData) => apiClient.post<{ imported_count: number; skipped_duplicates_count: number; errors: string[] }>('/students/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id: string, data: Partial<Student>) => apiClient.put<Student>(`/students/${id}`, data),
  delete: (id: string) => apiClient.delete(`/students/${id}`),
};

// Subjects
export const subjectsAPI = {
  list: (params?: Record<string, unknown>) => apiClient.get<Subject[]>('/subjects', { params }),
  get: (id: string) => apiClient.get<Subject>(`/subjects/${id}`),
  create: (data: Partial<Subject>) => apiClient.post<Subject>('/subjects', data),
  update: (id: string, data: Partial<Subject>) => apiClient.put<Subject>(`/subjects/${id}`, data),
};

// Sections
export const sectionsAPI = {
  list: (params?: Record<string, unknown>) => apiClient.get<Section[]>('/sections', { params }),
  get: (id: string) => apiClient.get<Section>(`/sections/${id}`),
  create: (data: Partial<Section>) => apiClient.post<Section>('/sections', data),
};

// Sessions
export const sessionsAPI = {
  list: (params?: Record<string, unknown>) => apiClient.get<PaginatedResponse<ClassSession>>('/sessions', { params }),
  getToday: () => apiClient.get<ClassSession[]>('/sessions/today'),
  get: (id: string) => apiClient.get<ClassSession>(`/sessions/${id}`),
  getAttendanceDetail: (id: string) => apiClient.get<SessionAttendanceDetail>(`/sessions/${id}/attendance-detail`),
  create: (data: Partial<ClassSession>) => apiClient.post<ClassSession>('/sessions', data),
  start: (id: string) => apiClient.put<ClassSession>(`/sessions/${id}/start`),
  end: (id: string) => apiClient.put<ClassSession>(`/sessions/${id}/end`),
  getSummary: (id: string) => apiClient.get(`/sessions/${id}/summary`),
};

// Attendance
export const attendanceAPI = {
  list: (params?: Record<string, unknown>) => apiClient.get<PaginatedResponse<AttendanceRecord>>('/attendance', { params }),
  get: (id: string) => apiClient.get<AttendanceRecord>(`/attendance/${id}`),
  mark: (data: Record<string, unknown>) => apiClient.post<AttendanceRecord>('/attendance/mark', data),
  verify: (id: string, data: { note?: string }) => apiClient.put<AttendanceRecord>(`/attendance/${id}/verify`, data),
  correct: (id: string, data: { status: string; note: string }) => apiClient.put<AttendanceRecord>(`/attendance/${id}/correct`, data),
  bySession: (sessionId: string) => apiClient.get<AttendanceRecord[]>(`/attendance/session/${sessionId}`),
};

// Face
export const faceAPI = {
  getStatus: (studentId: string) => apiClient.get<FaceTemplate[]>(`/face/${studentId}`),
  delete: (studentId: string) => apiClient.delete(`/face/${studentId}`),
};

// Analytics
export const analyticsAPI = {
  dashboard: () => apiClient.get<DashboardStats>('/analytics/dashboard'),
  trend: (days = 30) => apiClient.get<AttendanceTrendPoint[]>('/analytics/trend', { params: { days } }),
  bySubject: () => apiClient.get<SubjectAnalytics[]>('/analytics/by-subject'),
  lowAttendance: () => apiClient.get<LowAttendanceStudent[]>('/analytics/low-attendance'),
  forecast: (studentId: string) => apiClient.get(`/analytics/forecast/${studentId}`),
  insights: () => apiClient.get<AIInsight[]>('/analytics/insights'),
};

// Recognition Logs
export const recognitionAPI = {
  list: (params?: Record<string, unknown>) => apiClient.get<PaginatedResponse<RecognitionEvent>>('/recognition-logs', { params }),
};

// Anomalies
export const anomaliesAPI = {
  list: (params?: Record<string, unknown>) => apiClient.get<PaginatedResponse<Anomaly>>('/anomalies', { params }),
  resolve: (id: string) => apiClient.put(`/anomalies/${id}/resolve`),
};

// Audit Logs
export const auditAPI = {
  list: (params?: Record<string, unknown>) => apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs', { params }),
};

// Settings
export const settingsAPI = {
  list: () => apiClient.get<SystemSetting[]>('/settings'),
  update: (key: string, value: string) => apiClient.put(`/settings/${key}`, { value }),
};

// Reports
export const reportsAPI = {
  export: (params: Record<string, unknown>) => apiClient.get('/reports/export', { params, responseType: 'blob' }),
};

// AI Engine
export const aiAPI = {
  processFrame: (frame: string, sessionId: string) =>
    apiClient.post('/ai/process-frame', { frame, session_id: sessionId }),
  startEnrollment: (studentId: string) =>
    apiClient.post('/ai/enroll/start', { student_id: studentId }),
  captureEnrollment: (studentId: string, frame: string) =>
    apiClient.post('/ai/enroll/capture', { student_id: studentId, frame }),
  finalizeEnrollment: (studentId: string) =>
    apiClient.post('/ai/enroll/finalize', { student_id: studentId }),
  enrollmentStatus: (studentId: string) =>
    apiClient.get(`/ai/enroll/status/${studentId}`),
  cameraDevices: () => apiClient.get<number[]>('/ai/camera/devices'),
  engineStatus: () => apiClient.get('/ai/status'),
  loadTemplates: () => apiClient.post('/ai/load-templates'),
};

export default apiClient;
