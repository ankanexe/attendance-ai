'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { sessionsAPI } from '@/lib/api';
import { formatTime, formatDate } from '@/lib/utils';
import type { ClassSession } from '@/types';
import toast from 'react-hot-toast';

export default function TodaysClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await sessionsAPI.getToday();
      setClasses(res.data || []);
    } catch {
      toast.error('Failed to load today’s classes');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleStart = async (sessionId: string, currentStatus: string) => {
    if (currentStatus === 'UPCOMING') {
      try {
        await sessionsAPI.start(sessionId);
        toast.success('Session started! Launching Classroom Mode...');
      } catch {
        toast.error('Failed to start session');
      }
    }
    router.push(`/live-attendance?session_id=${sessionId}`);
  };

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader
        title="Today's Classes"
        subtitle={`Scheduled classes and active attendance sessions for today, ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={
          <Link href="/session-setup">
            <Button size="sm" icon="add">Schedule Session</Button>
          </Link>
        }
      />

      <div className="p-6 flex flex-col gap-6">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : classes.length === 0 ? (
          <EmptyState
            icon="event_busy"
            title="No classes scheduled for today"
            description="All scheduled sessions for today will appear here. You can start a new on-demand attendance session anytime."
            action={
              <Link href="/session-setup">
                <Button icon="add">Start New Session</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => {
              const isActive = cls.status === 'ACTIVE';
              const isCompleted = cls.status === 'COMPLETED';

              return (
                <div
                  key={cls.id}
                  className={`bento-card flex flex-col justify-between transition-all hover:shadow-md ${
                    isActive ? 'border-2 border-primary bg-primary/[0.02]' : ''
                  }`}
                >
                  <div>
                    {/* Header with status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                        {cls.subject?.code || 'CS-301'}
                      </span>
                      <StatusBadge status={cls.status} />
                    </div>

                    {/* Subject & Section */}
                    <h3 className="font-bold text-lg text-on-surface leading-tight">
                      {cls.subject?.name || 'Class Session'}
                    </h3>
                    <p className="text-sm font-medium text-on-surface-variant mt-1">
                      {cls.section?.section_name || 'Section A'} · {cls.subject?.department || 'CSE Core'}
                    </p>

                    {/* Metadata items */}
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-outline-variant/60">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-on-surface-variant">meeting_room</span>
                        <div>
                          <p className="text-[11px] text-on-surface-variant leading-none">Room</p>
                          <p className="text-sm font-semibold text-on-surface mt-0.5">{cls.room_number || 'LH-301'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-on-surface-variant">group</span>
                        <div>
                          <p className="text-[11px] text-on-surface-variant leading-none">Roster</p>
                          <p className="text-sm font-semibold text-on-surface mt-0.5">{cls.total_enrolled || 30} Students</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-on-surface-variant">schedule</span>
                        <div>
                          <p className="text-[11px] text-on-surface-variant leading-none">Start Time</p>
                          <p className="text-sm font-semibold text-on-surface mt-0.5">
                            {cls.start_time ? formatTime(cls.start_time) : '09:00 AM'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-on-surface-variant">timer</span>
                        <div>
                          <p className="text-[11px] text-on-surface-variant leading-none">Grace Period</p>
                          <p className="text-sm font-semibold text-on-surface mt-0.5">{cls.grace_period_minutes || 10} mins</p>
                        </div>
                      </div>
                    </div>

                    {/* Live attendance count preview if active/completed */}
                    {(isActive || isCompleted) && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container mt-4 text-xs font-semibold">
                        <span className="text-green-700">Present: {cls.present_count}</span>
                        <span className="text-amber-700">Late: {cls.late_count}</span>
                        <span className="text-red-700">
                          Absent: {Math.max(0, (cls.total_enrolled || 30) - (cls.present_count + cls.late_count))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t border-outline-variant/60 flex gap-2">
                    {isActive ? (
                      <Button
                        onClick={() => handleStart(cls.id, cls.status)}
                        icon="videocam"
                        className="w-full"
                        size="md"
                      >
                        Continue Attendance
                      </Button>
                    ) : isCompleted ? (
                      <Link href={`/sessions/${cls.id}`} className="w-full">
                        <Button variant="outline" icon="summarize" className="w-full" size="md">
                          View Attendance Result
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={() => handleStart(cls.id, cls.status)}
                        icon="play_arrow"
                        className="w-full"
                        size="md"
                      >
                        Start Attendance
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
