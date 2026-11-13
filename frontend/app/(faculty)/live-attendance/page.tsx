'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CameraView } from '@/components/classroom/CameraView';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { sessionsAPI, attendanceAPI, studentsAPI } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import type { ClassSession, AttendanceRecord, RecognitionResult, Student } from '@/types';
import toast from 'react-hot-toast';

interface LiveEvent {
  id: string;
  studentId: string | null;
  studentName: string;
  score: number;
  state: string;
  timestamp: Date;
  attendanceId?: string;
  message?: string;
}

function LiveAttendanceContent() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get('session_id') || '';

  const [session, setSession] = useState<ClassSession | null>(null);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [counts, setCounts] = useState({ present: 0, late: 0, verify: 0, unknown: 0 });
  const [cameraActive, setCameraActive] = useState(true);
  const [verifyDrawer, setVerifyDrawer] = useState(false);
  const [verifyEvent, setVerifyEvent] = useState<LiveEvent | null>(null);
  const [verifyCandidate, setVerifyCandidate] = useState<Student | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [endModal, setEndModal] = useState(false);
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');

  // Load session and student rosters
  useEffect(() => {
    if (!sessionId) return;
    const loadSession = async () => {
      try {
        const res = await sessionsAPI.get(sessionId);
        setSession(res.data);
        setCounts({
          present: res.data.present_count || 0,
          late: res.data.late_count || 0,
          verify: res.data.verify_count || 0,
          unknown: res.data.unknown_count || 0,
        });

        const stuRes = await studentsAPI.list({ limit: 100 });
        const nameMap: Record<string, string> = {};
        (stuRes.data.items || []).forEach(s => { nameMap[s.id] = s.full_name; });
        setStudentNames(nameMap);
      } catch {
        toast.error('Could not load session details');
      }
    };
    loadSession();
  }, [sessionId]);

  // Elapsed timer
  useEffect(() => {
    if (!session?.start_time) return;
    const start = new Date(session.start_time).getTime();
    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [session]);

  // Handle incoming frame AI results
  const handleAIResults = useCallback((results: RecognitionResult[]) => {
    for (const r of results) {
      const name = r.student_id ? (studentNames[r.student_id] || 'Student') : 'Unknown Person';

      if (r.state === 'MATCHED' && r.student_id) {
        setCounts(c => ({ ...c, present: c.present + 1 }));
        setEvents(prev => [
          {
            id: String(Date.now()) + Math.random(),
            studentId: r.student_id,
            studentName: name,
            score: r.recognition_score,
            state: 'MATCHED',
            timestamp: new Date(),
          },
          ...prev.slice(0, 49),
        ]);
      } else if (r.state === 'AMBIGUOUS' && r.student_id) {
        setCounts(c => ({ ...c, verify: c.verify + 1 }));
        setEvents(prev => [
          {
            id: String(Date.now()) + Math.random(),
            studentId: r.student_id,
            studentName: name,
            score: r.recognition_score,
            state: 'AMBIGUOUS',
            timestamp: new Date(),
          },
          ...prev.slice(0, 49),
        ]);
      } else if (r.state === 'NOT_IN_SESSION' && r.student_id) {
        setEvents(prev => [
          {
            id: String(Date.now()) + Math.random(),
            studentId: r.student_id,
            studentName: name,
            score: r.recognition_score,
            state: 'NOT_IN_SESSION',
            timestamp: new Date(),
            message: 'Recognized — Not Enrolled in This Session'
          },
          ...prev.slice(0, 49),
        ]);
      } else if (r.state === 'UNKNOWN') {
        setCounts(c => ({ ...c, unknown: c.unknown + 1 }));
      }
    }
  }, [studentNames]);

  // Open Verify Drawer for ambiguous match
  const openVerify = async (ev: LiveEvent) => {
    setVerifyEvent(ev);
    if (ev.studentId) {
      try {
        const res = await studentsAPI.get(ev.studentId);
        setVerifyCandidate(res.data);
      } catch {
        setVerifyCandidate(null);
      }
    }
    setVerifyDrawer(true);
  };

  // Confirm attendance from drawer
  const handleConfirmVerify = async (status: 'PRESENT' | 'LATE') => {
    if (!verifyEvent?.studentId || !sessionId) return;
    setVerifying(true);
    try {
      await attendanceAPI.mark({
        session_id: sessionId,
        student_id: verifyEvent.studentId,
        recognition_score: verifyEvent.score / 100,
        status: status,
        marked_method: 'VERIFY_CONFIRMED',
      });
      toast.success(`${verifyCandidate?.full_name || 'Student'} marked as ${status}!`);
      setVerifyDrawer(false);
      setCounts(c => ({ ...c, [status.toLowerCase()]: (c as any)[status.toLowerCase()] + 1, verify: Math.max(0, c.verify - 1) }));
    } catch {
      toast.error('Failed to confirm attendance');
    }
    setVerifying(false);
  };

  // End Session: Stop camera, calculate absences, and navigate to Session Attendance result
  const handleEndSession = async () => {
    setEnding(true);
    setCameraActive(false); // Stop camera immediately
    try {
      await sessionsAPI.end(sessionId);
      toast.success('Session finalized successfully!');
      router.push(`/sessions/${sessionId}`);
    } catch {
      toast.error('Failed to finalize session');
      setEnding(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant">videocam_off</span>
        <h2 className="text-xl font-bold text-on-surface">No Session Selected</h2>
        <p className="text-on-surface-variant text-sm max-w-md">
          Please select or configure a class session to begin live attendance capture.
        </p>
        <Button onClick={() => router.push('/todays-classes')} icon="event_available">
          View Today's Classes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-background">
      {/* Top Session Bar */}
      <div className="bg-white border-b border-outline-variant px-6 py-3 flex items-center justify-between gap-4 flex-wrap shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-green-500 live-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-on-surface leading-none">
                {session?.subject?.name || 'Live Classroom Attendance'}
              </h1>
              <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                {session?.subject?.code || 'CS-301'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {session?.section?.section_name || 'Section A'} · Room {session?.room_number || 'LH-301'} · Grace Period {session?.grace_period_minutes || 10}m
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container text-xs font-mono font-bold text-on-surface">
            <span className="material-symbols-outlined text-sm text-primary">timer</span>
            {elapsed}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCameraActive(prev => !prev)}
            icon={cameraActive ? 'videocam_off' : 'videocam'}
          >
            {cameraActive ? 'Stop Camera' : 'Start Camera'}
          </Button>

          <Button variant="danger" size="sm" icon="stop_circle" onClick={() => setEndModal(true)}>
            End Session
          </Button>
        </div>
      </div>

      {/* Main Classroom View */}
      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Cols: Camera Feed + Live Counter Cards */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <CameraView
            sessionId={sessionId}
            onResults={handleAIResults}
            studentNames={studentNames}
            active={cameraActive}
            onToggleCamera={() => setCameraActive(prev => !prev)}
          />

          {/* Live Counter Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Present', count: counts.present, color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: 'check_circle' },
              { label: 'Late', count: counts.late, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: 'schedule' },
              { label: 'Verify', count: counts.verify, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', icon: 'verified_user' },
              { label: 'Unknown', count: counts.unknown, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: 'help_outline' },
            ].map(c => (
              <div key={c.label} className={`p-4 rounded-2xl border ${c.bg} flex items-center justify-between`}>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant">{c.label}</p>
                  <p className={`text-2xl font-black ${c.color} mt-0.5`}>{c.count}</p>
                </div>
                <span className={`material-symbols-outlined text-2xl ${c.color} opacity-80`}>{c.icon}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Live Recognition Stream Ticker */}
        <div className="bento-card flex flex-col h-full max-h-[640px]">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">stream</span>
              Live Recognition Feed
            </h3>
            <span className="text-xs text-on-surface-variant">{events.length} Events</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/40 py-2">
            {events.length === 0 ? (
              <div className="py-16 text-center text-on-surface-variant text-xs flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">face</span>
                <p>Waiting for students to enter camera frame...</p>
              </div>
            ) : (
              events.map(ev => {
                const isMatched = ev.state === 'MATCHED';
                const isAmbiguous = ev.state === 'AMBIGUOUS';
                const isNotInSession = ev.state === 'NOT_IN_SESSION';

                return (
                  <div key={ev.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={ev.studentName} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-on-surface truncate leading-tight">
                          {ev.studentName}
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                          {isNotInSession ? (
                            <span className="text-blue-600 font-medium">Not in this Class</span>
                          ) : (
                            `${formatTime(ev.timestamp.toISOString())} · ${(ev.score).toFixed(1)}%`
                          )}
                        </p>
                      </div>
                    </div>

                    <div>
                      {isMatched && <StatusBadge status="PRESENT" />}
                      {isNotInSession && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-md">
                          OTHER SEC
                        </span>
                      )}
                      {isAmbiguous && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openVerify(ev)}
                          className="text-xs py-1 px-2.5 h-7"
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Slide-Out [VERIFY] Human-in-the-Loop Drawer */}
      <Drawer open={verifyDrawer} onClose={() => setVerifyDrawer(false)} title="Confirm Attendance Match">
        {verifyEvent && (
          <div className="flex flex-col gap-5">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
              <strong>Ambiguous Match (60%–79%):</strong> The AI engine detected a potential face match requiring faculty confirmation.
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container border border-outline-variant">
              <Avatar name={verifyCandidate?.full_name || verifyEvent.studentName} size="lg" />
              <div>
                <h4 className="font-bold text-base text-on-surface">{verifyCandidate?.full_name || verifyEvent.studentName}</h4>
                <p className="text-xs text-on-surface-variant font-mono mt-0.5">{verifyCandidate?.student_id || 'CSE301'} · {verifyCandidate?.roll_number || 'CS3A-01'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                    Similarity: {verifyEvent.score.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handleConfirmVerify('PRESENT')}
                loading={verifying}
                icon="check_circle"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Confirm Attendance (Mark PRESENT)
              </Button>
              <Button
                onClick={() => handleConfirmVerify('LATE')}
                loading={verifying}
                icon="schedule"
                variant="outline"
                className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                Mark as LATE
              </Button>
              <Button
                variant="ghost"
                onClick={() => setVerifyDrawer(false)}
                className="w-full text-on-surface-variant"
              >
                Dismiss / Not This Student
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* End Session Modal */}
      <Modal open={endModal} onClose={() => setEndModal(false)} title="End Attendance Session?" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Ending the session will stop the camera, record all arrival timestamps, and automatically mark all unrecorded students as <strong>ABSENT</strong>.
          </p>

          <div className="grid grid-cols-2 gap-3 text-center text-sm">
            <div className="p-3 rounded-xl bg-green-50 border border-green-200">
              <p className="text-2xl font-black text-green-700">{counts.present}</p>
              <p className="text-xs text-green-800 font-medium mt-0.5">Present</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-2xl font-black text-amber-700">{counts.late}</p>
              <p className="text-xs text-amber-800 font-medium mt-0.5">Late</p>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setEndModal(false)} className="flex-1">Cancel</Button>
            <Button variant="danger" loading={ending} onClick={handleEndSession} className="flex-1">
              Finalize & View Result
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function LiveAttendancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading Classroom Mode..." /></div>}>
      <LiveAttendanceContent />
    </Suspense>
  );
}