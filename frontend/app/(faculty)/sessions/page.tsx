'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { sessionsAPI } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ClassSession } from '@/types';
import toast from 'react-hot-toast';

function SessionsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const endedId = params.get('ended');
    if (endedId) toast.success('Session ended successfully. Attendance has been finalized.');
  }, [params]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await sessionsAPI.list({ status: filter === 'ALL' ? undefined : filter, limit: 50 });
      setSessions(res.data.items || []);
    } catch { toast.error('Failed to load sessions'); }
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, [filter]);

  const FILTERS = ['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader
        title="Class Sessions"
        subtitle="Manage and monitor your attendance sessions"
        actions={
          <Link href="/session-setup">
            <Button size="sm" icon="add">New Session</Button>
          </Link>
        }
      />
      <div className="p-6 flex flex-col gap-4">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-white border border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <BentoCard>
          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : sessions.length === 0 ? (
            <EmptyState icon="calendar_month" title="No sessions found" action={<Link href="/session-setup"><Button icon="add">Start Session</Button></Link>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant">
                    {['Subject', 'Section', 'Room', 'Date', 'Start Time', 'Present', 'Late', 'Total', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-on-surface-variant uppercase first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                      <td className="py-3 px-3 first:pl-0 font-semibold text-on-surface">{s.subject?.name ?? '—'}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{s.section?.section_name ?? '—'}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{s.room_number ?? '—'}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{formatDate(s.session_date)}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{s.start_time ? formatTime(s.start_time) : '—'}</td>
                      <td className="py-3 px-3 font-bold text-green-600">{s.present_count}</td>
                      <td className="py-3 px-3 font-bold text-amber-600">{s.late_count}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{s.total_enrolled}</td>
                      <td className="py-3 px-3"><StatusBadge status={s.status} /></td>
                      <td className="py-3 px-3">
                        {s.status === 'ACTIVE' && (
                          <Link href={`/live-attendance?session_id=${s.id}`}>
                            <Button size="sm" icon="videocam">Continue</Button>
                          </Link>
                        )}
                        {s.status === 'UPCOMING' && (
                          <Link href={`/session-setup`}>
                            <Button size="sm" variant="secondary" icon="play_arrow">Start</Button>
                          </Link>
                        )}
                        {s.status === 'COMPLETED' && (
                          <Link href={`/attendance?session_id=${s.id}`}>
                            <Button size="sm" variant="ghost" icon="summarize">Summary</Button>
                          </Link>
                        )}
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

export default function SessionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading Sessions..." /></div>}>
      <SessionsContent />
    </Suspense>
  );
}
