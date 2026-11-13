'use client';
import { useEffect, useState } from 'react';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { analyticsAPI } from '@/lib/api';
import type { AttendanceTrendPoint, SubjectAnalytics, LowAttendanceStudent } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';

export default function AnalyticsPage() {
  const [trend, setTrend] = useState<AttendanceTrendPoint[]>([]);
  const [subjects, setSubjects] = useState<SubjectAnalytics[]>([]);
  const [lowStudents, setLowStudents] = useState<LowAttendanceStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsAPI.trend(30),
      analyticsAPI.bySubject(),
      analyticsAPI.lowAttendance(),
    ]).then(([t, s, l]) => {
      setTrend(t.data);
      setSubjects(s.data);
      setLowStudents(l.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const trendData = trend.map(t => ({
    date: new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    rate: Math.round(t.attendance_rate),
    present: t.present,
    late: t.late,
    absent: t.absent,
  }));

  const COLORS = ['#3525CD', '#006A61', '#D97706', '#BA1A1A', '#6B21A8'];

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader title="Analytics" subtitle="Attendance insights and trends" />
      <div className="p-6 flex flex-col gap-6">
        {/* Trend Chart */}
        <BentoCard title="30-Day Attendance Trend" subtitle="Daily attendance rate across all sessions">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3525CD" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3525CD" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5EEFF" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#464555' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#464555' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip
                formatter={(val: number) => [`${val}%`, 'Attendance Rate']}
                contentStyle={{ background: '#fff', border: '1px solid #C7C4D8', borderRadius: '12px', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="rate" stroke="#3525CD" strokeWidth={2.5} fill="url(#grad1)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </BentoCard>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Subject attendance bars */}
          <BentoCard title="Attendance by Subject" subtitle="Average attendance rate per course">
            {subjects.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-6">No subject data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={subjects} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EEFF" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#464555' }} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="subject_code" type="category" tick={{ fontSize: 11, fill: '#464555' }} width={70} />
                  <Tooltip
                    formatter={(val: number) => [`${val.toFixed(1)}%`, 'Attendance Rate']}
                    contentStyle={{ background: '#fff', border: '1px solid #C7C4D8', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="attendance_rate" radius={[0, 6, 6, 0]}>
                    {subjects.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </BentoCard>

          {/* Low attendance students */}
          <BentoCard title="Low Attendance Alert" subtitle="Students below 75% threshold">
            {lowStudents.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 text-center">
                <span className="material-symbols-outlined text-4xl text-green-500">verified</span>
                <p className="font-semibold text-on-surface">All students above threshold</p>
                <p className="text-sm text-on-surface-variant">No students below 75% attendance.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
                {lowStudents.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-red-50 border border-red-100">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{s.student_name}</p>
                      <p className="text-xs text-on-surface-variant">{s.roll_number} · {s.subject_code}</p>
                    </div>
                    <span className="text-red-600 font-black text-lg">{s.attendance_percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </BentoCard>
        </div>

        {/* Attendance forecast */}
        <BentoCard title="Attendance Forecast Calculator" subtitle="Formula-based projection (not ML-based)">
          <p className="text-sm text-on-surface-variant mb-4">
            Select a student to calculate their projected attendance based on next 5 sessions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'If attends next 5', icon: 'trending_up', color: 'text-green-600 bg-green-50 border-green-200', desc: 'Best case' },
              { label: 'Current rate', icon: 'remove', color: 'text-blue-600 bg-blue-50 border-blue-200', desc: 'Present state' },
              { label: 'If misses next 5', icon: 'trending_down', color: 'text-red-600 bg-red-50 border-red-200', desc: 'Worst case' },
            ].map(c => (
              <div key={c.label} className={`p-4 rounded-2xl border ${c.color} text-center`}>
                <span className={`material-symbols-outlined text-3xl mb-2 block`}>{c.icon}</span>
                <p className="text-2xl font-black">—%</p>
                <p className="text-sm font-medium mt-1">{c.label}</p>
                <p className="text-xs opacity-70">{c.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant mt-4">
            Note: Projection formula = (classes_attended ± 5) / (total_classes ± 5) × 100. No ML model is used.
          </p>
        </BentoCard>
      </div>
    </div>
  );
}
