'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { studentsAPI } from '@/lib/api';
import type { StudentDossier } from '@/types';
import toast from 'react-hot-toast';

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [dossier, setDossier] = useState<StudentDossier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    studentsAPI.getDetail(id).then(res => {
      setDossier(res.data);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load student profile:', err);
      toast.error('Failed to load student profile');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading student attendance profile..." />
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="p-6 text-center">
        <p className="text-on-surface-variant text-sm">Student record not found.</p>
        <Button onClick={() => router.push('/students')} className="mt-4">Back to Student Directory</Button>
      </div>
    );
  }

  const rate = dossier.overall_attendance ?? 0;
  const isEligible = rate >= 75;

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader
        title={dossier.full_name}
        subtitle={`${dossier.student_id} · Roll: ${dossier.roll_number} · ${dossier.department} · Sem ${dossier.semester} · ${dossier.section}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/face-registration?student_id=${dossier.id}`}>
              <Button size="sm" variant="secondary" icon="face">
                {dossier.face_enrolled ? 'Update Face Data' : 'Register 3-Photo Face'}
              </Button>
            </Link>
            <Link href={`/attendance?student_id=${dossier.id}`}>
              <Button size="sm" variant="outline" icon="history">
                Full Ledger
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-6 flex flex-col gap-6">
        {/* Profile Card Header */}
        <BentoCard>
          <div className="flex items-center gap-6 flex-wrap">
            <Avatar name={dossier.full_name} size="xl" />
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-on-surface">{dossier.full_name}</h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  dossier.face_enrolled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {dossier.face_enrolled ? `✓ ${dossier.face_sample_count || 3}/3 Face Templates Stored` : '⚠ Face Not Enrolled'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">{dossier.email}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-outline-variant/60">
                <div>
                  <p className="text-[11px] text-on-surface-variant leading-none">University ID</p>
                  <p className="text-sm font-mono font-bold text-primary mt-0.5">{dossier.student_id}</p>
                </div>
                <div>
                  <p className="text-[11px] text-on-surface-variant leading-none">Roll Number</p>
                  <p className="text-sm font-mono font-semibold text-on-surface mt-0.5">{dossier.roll_number}</p>
                </div>
                <div>
                  <p className="text-[11px] text-on-surface-variant leading-none">Department & Sem</p>
                  <p className="text-sm font-semibold text-on-surface mt-0.5">{dossier.department} · Sem {dossier.semester}</p>
                </div>
                <div>
                  <p className="text-[11px] text-on-surface-variant leading-none">Section</p>
                  <p className="text-sm font-semibold text-on-surface mt-0.5">{dossier.section}</p>
                </div>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* 4 Core Attendance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bento-card text-center">
            <p className={`text-3xl font-black ${isEligible ? 'text-green-600' : 'text-red-600'}`}>
              {rate.toFixed(1)}%
            </p>
            <p className="text-xs font-semibold text-on-surface-variant mt-1">Overall Attendance</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mt-2 inline-block ${
              isEligible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isEligible ? 'Eligible for Exams (≥ 75%)' : 'Warning: Below 75% Cutoff'}
            </span>
          </div>

          <div className="bento-card text-center">
            <p className="text-3xl font-black text-green-600">{dossier.classes_attended}</p>
            <p className="text-xs font-semibold text-on-surface-variant mt-1">Classes Attended (On-Time)</p>
            <p className="text-[10px] text-on-surface-variant mt-2">Recorded by AI Camera</p>
          </div>

          <div className="bento-card text-center">
            <p className="text-3xl font-black text-amber-600">{dossier.classes_late}</p>
            <p className="text-xs font-semibold text-on-surface-variant mt-1">Late Arrivals</p>
            <p className="text-[10px] text-on-surface-variant mt-2">Past 10m Grace Period</p>
          </div>

          <div className="bento-card text-center">
            <p className="text-3xl font-black text-red-600">{dossier.classes_missed}</p>
            <p className="text-xs font-semibold text-on-surface-variant mt-1">Classes Missed</p>
            <p className="text-[10px] text-on-surface-variant mt-2">Total Classes: {dossier.total_classes}</p>
          </div>
        </div>

        {/* Last Class Attendance Dossier */}
        <BentoCard title="Last Class Attendance Record" subtitle="Exact AI recognition timestamp and verification">
          {dossier.last_attendance ? (
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/60 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-primary">schedule</span>
                <div>
                  <p className="font-bold text-sm text-on-surface">{dossier.last_attendance.date_time || 'Recent Session'}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Recognition Confidence: {dossier.last_attendance.score ? `${dossier.last_attendance.score}%` : 'Standard'}</p>
                </div>
              </div>
              <StatusBadge status={dossier.last_attendance.status || 'PRESENT'} />
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant py-2">No past attendance records on file for this student.</p>
          )}
        </BentoCard>

        {/* Subject-Wise Attendance Breakdown */}
        <BentoCard title="Subject-Wise Attendance Breakdown" subtitle="Detailed performance across enrolled academic subjects">
          {dossier.subject_breakdown.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-4">No subject enrollments mapped.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase">
                    <th className="pb-3 px-3">Subject Code</th>
                    <th className="pb-3 px-3">Subject Name</th>
                    <th className="pb-3 px-3">Total Classes</th>
                    <th className="pb-3 px-3">Attended</th>
                    <th className="pb-3 px-3">Missed</th>
                    <th className="pb-3 px-3">Attendance %</th>
                    <th className="pb-3 px-3">Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {dossier.subject_breakdown.map(sub => {
                    const subEligible = sub.attendance_rate >= 75;

                    return (
                      <tr key={sub.subject_id} className="hover:bg-surface-container/30 transition-colors">
                        <td className="py-3 px-3 font-mono text-xs font-bold text-primary">{sub.subject_code}</td>
                        <td className="py-3 px-3 font-semibold text-on-surface">{sub.subject_name}</td>
                        <td className="py-3 px-3 text-xs">{sub.total_classes}</td>
                        <td className="py-3 px-3 text-xs font-bold text-green-700">{sub.attended}</td>
                        <td className="py-3 px-3 text-xs font-bold text-red-700">{sub.missed}</td>
                        <td className="py-3 px-3">
                          <span className={`font-bold text-xs px-2 py-0.5 rounded-md ${
                            subEligible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {sub.attendance_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs font-medium">
                          {subEligible ? (
                            <span className="text-green-700 font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">check_circle</span> OK
                            </span>
                          ) : (
                            <span className="text-red-700 font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">warning</span> At Risk
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </BentoCard>

        {/* Recent Attendance History */}
        <BentoCard title="Recent Class History" subtitle="Last 20 attendance timestamps">
          {dossier.recent_records.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-4">No recent attendance records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase">
                    <th className="pb-3 px-3">Timestamp</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">AI Score</th>
                    <th className="pb-3 px-3">Marking Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {dossier.recent_records.map(r => (
                    <tr key={r.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="py-3 px-3 text-xs font-medium text-on-surface">{r.timestamp}</td>
                      <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
                      <td className="py-3 px-3 font-mono text-xs">{r.score !== null ? `${r.score}%` : '—'}</td>
                      <td className="py-3 px-3 text-xs text-on-surface-variant">{r.marked_method.replace('_', ' ')}</td>
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
