'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { BentoCard } from '@/components/ui/BentoCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { analyticsAPI, sessionsAPI } from '@/lib/api';
import { formatTime, formatDate } from '@/lib/utils';
import type { DashboardStats, ClassSession, AttendanceTrendPoint } from '@/types';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function FacultyDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todaysClasses, setTodaysClasses] = useState<ClassSession[]>([]);
  const [recentSessions, setRecentSessions] = useState<ClassSession[]>([]);
  const [trend, setTrend] = useState<AttendanceTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.dashboard(),
      sessionsAPI.getToday(),
      sessionsAPI.list({ limit: 5 }),
      analyticsAPI.trend(14),
    ]).then(([statsRes, todayRes, sessRes, trendRes]) => {
      setStats(statsRes.data);
      setTodaysClasses(todayRes.data || []);
      setRecentSessions(sessRes.data.items || []);
      setTrend(trendRes.data || []);
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load dashboard data:', err);
      setLoading(false);
    });
  }, []);

  const handleStartClass = async (sessionId: string, currentStatus: string) => {
    if (currentStatus === 'UPCOMING') {
      try {
        await sessionsAPI.start(sessionId);
        toast.success('Session started!');
      } catch {
        toast.error('Failed to start session');
      }
    }
    router.push(`/live-attendance?session_id=${sessionId}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading teaching dashboard..." />
      </div>
    );
  }

  const chartData = trend.map(t => ({
    date: new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    rate: Math.round(t.attendance_rate),
    present: t.present,
    late: t.late,
  }));

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader
        title="Faculty Command Center"
        subtitle={`B.Tech CSE Core · Today is ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={
          <Link href="/session-setup">
            <Button size="sm" icon="videocam">Start Attendance</Button>
          </Link>
        }
      />

      <div className="p-6 flex flex-col gap-6">
        {/* Quick Action Hub */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Link href="/session-setup">
            <Button size="sm" icon="play_arrow">Start Attendance</Button>
          </Link>
          <Link href="/todays-classes">
            <Button size="sm" variant="outline" icon="event_available">Today's Classes</Button>
          </Link>
          <Link href="/students">
            <Button size="sm" variant="outline" icon="person_add">Student Directory</Button>
          </Link>
          <Link href="/face-registration">
            <Button size="sm" variant="outline" icon="face">Enroll Face</Button>
          </Link>
          <Link href="/camera-setup">
            <Button size="sm" variant="outline" icon="photo_camera">Camera Setup</Button>
          </Link>
          <Link href="/reports">
            <Button size="sm" variant="outline" icon="download">Export CSV</Button>
          </Link>
        </div>

        {/* 1. Today's Classes Section (Primary normal focus) */}
        <BentoCard
          title="Today's Classes"
          subtitle="Your scheduled teaching sessions for today"
          action={
            <Link href="/todays-classes" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          }
        >
          {todaysClasses.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant text-sm">
              <p>No teaching sessions scheduled for today.</p>
              <Link href="/session-setup" className="inline-block mt-3">
                <Button size="sm" icon="add">Schedule On-Demand Session</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaysClasses.map(cls => {
                const isActive = cls.status === 'ACTIVE';
                const isCompleted = cls.status === 'COMPLETED';

                return (
                  <div
                    key={cls.id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                      isActive ? 'bg-primary/[0.03] border-primary shadow-sm' : 'bg-surface-container/40 border-outline-variant'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {cls.subject?.code || 'CS-301'}
                        </span>
                        <StatusBadge status={cls.status} />
                      </div>

                      <h4 className="font-bold text-base text-on-surface leading-tight">
                        {cls.subject?.name || 'Course Session'}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {cls.section?.section_name || 'Section A'} · Room {cls.room_number || 'LH-301'}
                      </p>

                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-outline-variant/60 text-xs text-on-surface-variant">
                        <span>⏰ {cls.start_time ? formatTime(cls.start_time) : '09:00 AM'}</span>
                        <span>👥 {cls.total_enrolled || 30} Roster</span>
                        <span>⏱ {cls.grace_period_minutes || 10}m Grace</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-outline-variant/60">
                      {isActive ? (
                        <Button
                          onClick={() => handleStartClass(cls.id, cls.status)}
                          icon="videocam"
                          size="sm"
                          className="w-full"
                        >
                          Continue Attendance
                        </Button>
                      ) : isCompleted ? (
                        <Link href={`/sessions/${cls.id}`} className="w-full block">
                          <Button variant="outline" icon="summarize" size="sm" className="w-full">
                            View Who Attended
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          onClick={() => handleStartClass(cls.id, cls.status)}
                          icon="play_arrow"
                          size="sm"
                          className="w-full"
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
        </BentoCard>

        {/* 2. Operational Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Students"
            value={stats ? stats.total_students : '—'}
            icon="group"
            trend="Enrolled in Department"
          />
          <MetricCard
            title="Average Attendance"
            value={stats ? `${stats.attendance_rate_today}%` : '—'}
            icon="percent"
            color={stats && stats.attendance_rate_today >= 75 ? 'green' : 'amber'}
            trend={stats && stats.attendance_rate_today >= 75 ? 'Above 75% cutoff' : 'Below 75% cutoff'}
            trendUp={Boolean(stats && stats.attendance_rate_today >= 75)}
          />
          <MetricCard
            title="Late Arrivals"
            value={stats ? stats.late_today : '—'}
            icon="schedule"
            color="amber"
            trend="Past grace period"
          />
          <MetricCard
            title="Verifications"
            value={stats ? stats.verify_pending : '0'}
            icon="verified_user"
            color="purple"
            trend="Ambiguous matches"
          />
        </div>

        {/* 3. Trend Chart & Recent Sessions */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <BentoCard title="14-Day Attendance Trend" subtitle="Daily attendance percentage across your classes">
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3525CD" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3525CD" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EEFF" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#464555' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#464555' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Attendance Rate']}
                    contentStyle={{ background: '#fff', border: '1px solid #C7C4D8', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#3525CD" strokeWidth={2.5} fill="url(#attendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </BentoCard>

          {/* Recent Sessions */}
          <BentoCard
            title="Recent Sessions"
            subtitle="Past attendance records and class outcomes"
            action={
              <Link href="/sessions" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            }
          >
            {recentSessions.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-8 text-center">No past sessions recorded yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-outline-variant/50">
                {recentSessions.slice(0, 4).map(sess => (
                  <div key={sess.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary text-base">menu_book</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface leading-tight">
                          {sess.subject?.name || 'Class Session'}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {sess.section?.section_name || 'Section A'} · {formatDate(sess.session_date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <span className="font-bold text-green-600">{sess.present_count} Present</span>
                        <span className="text-on-surface-variant"> / {sess.total_enrolled}</span>
                      </div>
                      <Link href={`/sessions/${sess.id}`}>
                        <Button size="sm" variant="ghost" icon="visibility">
                          Result
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BentoCard>
        </div>
      </div>
    </div>
  );
}