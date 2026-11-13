'use client';
import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { sessionsAPI, reportsAPI } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import type { SessionAttendanceDetail, SessionAttendee } from '@/types';
import toast from 'react-hot-toast';

function SessionAttendanceContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const [detail, setDetail] = useState<SessionAttendanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'present' | 'late' | 'absent' | 'verify' | 'unknown'>('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await sessionsAPI.getAttendanceDetail(sessionId);
        setDetail(res.data);
      } catch {
        toast.error('Failed to load session attendance detail');
      }
      setLoading(false);
    };
    fetchDetail();
  }, [sessionId]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await reportsAPI.export({ session_id: sessionId, format: 'csv' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendance_Session_${sessionId.slice(0, 8)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Session attendance CSV exported successfully!');
    } catch {
      toast.error('Failed to export CSV report');
    }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading session attendance result..." />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6">
        <EmptyState
          icon="event_busy"
          title="Session not found"
          description="Could not locate the requested attendance session."
          action={<Button onClick={() => router.push('/sessions')}>Back to Sessions</Button>}
        />
      </div>
    );
  }

  const { session, counts, rosters } = detail;
  const currentRoster: SessionAttendee[] = (rosters as any)[activeTab] || rosters.all;

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader
        title={`Session Attendance — ${session.subject?.name || 'Class Session'}`}
        subtitle={`${session.section?.section_name || 'Section A'} · Room ${session.room_number || 'LH-301'} · ${formatDate(session.session_date)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon="download"
              loading={exporting}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            {session.status === 'ACTIVE' && (
              <Link href={`/live-attendance?session_id=${session.id}`}>
                <Button size="sm" icon="videocam">Back to Live Camera</Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="p-6 flex flex-col gap-6">
        {/* 6 Category Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'all', label: 'Enrolled', count: counts.enrolled, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
            { key: 'present', label: 'Present', count: counts.present, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
            { key: 'late', label: 'Late', count: counts.late, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { key: 'absent', label: 'Absent', count: counts.absent, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
            { key: 'verify', label: 'Verify', count: counts.verify, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
            { key: 'unknown', label: 'Unknown', count: counts.unknown, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
          ].map(c => (
            <button
              key={c.key}
              onClick={() => setActiveTab(c.key as any)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeTab === c.key ? 'ring-2 ring-primary shadow-sm bg-white' : c.bg
              }`}
            >
              <p className="text-xs font-semibold text-on-surface-variant">{c.label}</p>
              <p className={`text-2xl font-black ${c.color} mt-0.5`}>{c.count}</p>
            </button>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-outline-variant pb-2 overflow-x-auto">
          {[
            { id: 'all', label: `All Students (${counts.enrolled})` },
            { id: 'present', label: `Present (${counts.present})` },
            { id: 'late', label: `Late (${counts.late})` },
            { id: 'absent', label: `Absent (${counts.absent})` },
            { id: 'verify', label: `Verify Pending (${counts.verify})` },
            { id: 'unknown', label: `Unknown Detections (${counts.unknown})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Attendee Roster Table */}
        <BentoCard
          title={
            activeTab === 'all' ? 'Complete Class Roster'
            : activeTab === 'present' ? 'Present Attendees (On-Time)'
            : activeTab === 'late' ? 'Late Attendees (Past Grace Period)'
            : activeTab === 'absent' ? 'Absent Students (Unrecorded)'
            : activeTab === 'verify' ? 'Ambiguous Verifications'
            : 'Unknown Detections'
          }
          subtitle={`Showing ${activeTab === 'unknown' ? rosters.unknown.length : currentRoster.length} records`}
        >
          {activeTab === 'unknown' ? (
            rosters.unknown.length === 0 ? (
              <p className="py-8 text-center text-sm text-on-surface-variant">No unknown faces detected during this class.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-xs text-on-surface-variant font-bold uppercase">
                      <th className="pb-3 px-3">Event ID</th>
                      <th className="pb-3 px-3">Detection Time</th>
                      <th className="pb-3 px-3">Confidence Score</th>
                      <th className="pb-3 px-3">Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50">
                    {rosters.unknown.map(u => (
                      <tr key={u.id}>
                        <td className="py-3 px-3 font-mono text-xs text-on-surface-variant">{u.id.slice(0, 12)}</td>
                        <td className="py-3 px-3 font-medium text-on-surface">{u.timestamp}</td>
                        <td className="py-3 px-3 font-mono text-xs">{u.score}%</td>
                        <td className="py-3 px-3">
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                            UNKNOWN FACE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : currentRoster.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">No students found in this category.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-xs text-on-surface-variant font-bold uppercase">
                    <th className="pb-3 px-3">Student Name</th>
                    <th className="pb-3 px-3">Student ID</th>
                    <th className="pb-3 px-3">Roll Number</th>
                    <th className="pb-3 px-3">Arrival Time</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">AI Score</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {currentRoster.map(stu => (
                    <tr key={stu.student_id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={stu.full_name} size="sm" />
                          <div>
                            <Link
                              href={`/students/${stu.student_id}`}
                              className="font-semibold text-on-surface hover:text-primary transition-colors hover:underline"
                            >
                              {stu.full_name}
                            </Link>
                            <p className="text-[11px] text-on-surface-variant">{stu.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-primary">{stu.university_id}</td>
                      <td className="py-3 px-3 font-mono text-xs text-on-surface-variant">{stu.roll_number}</td>
                      <td className="py-3 px-3 text-xs font-medium">
                        {stu.time}
                        {stu.minutes_late > 0 && (
                          <span className="text-amber-700 font-bold ml-1.5">(+{stu.minutes_late}m late)</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={stu.status} />
                      </td>
                      <td className="py-3 px-3 font-mono text-xs">
                        {stu.score !== null ? `${stu.score}%` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link href={`/students/${stu.student_id}`}>
                          <Button size="sm" variant="ghost" icon="account_circle">
                            Profile
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </BentoCard>
      </div>
    </div>
  );
}

export default function SessionDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading session detail..." /></div>}>
      <SessionAttendanceContent />
    </Suspense>
  );
}
