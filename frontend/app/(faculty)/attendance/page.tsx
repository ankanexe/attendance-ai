'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { attendanceAPI } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { AttendanceRecord } from '@/types';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

function AttendanceContent() {
  const params = useSearchParams();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [correctDrawer, setCorrectDrawer] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [correcting, setCorreating] = useState(false);
  const [newStatus, setNewStatus] = useState('PRESENT');
  const [note, setNote] = useState('');

  const sessionId = params.get('session_id') || '';

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceAPI.list({
        session_id: sessionId || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
      setRecords(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load attendance records'); }
    setLoading(false);
  }, [sessionId, statusFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const openCorrect = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setNewStatus(record.status);
    setNote('');
    setCorrectDrawer(true);
  };

  const handleCorrect = async () => {
    if (!selectedRecord) return;
    setCorreating(true);
    try {
      await attendanceAPI.correct(selectedRecord.id, { status: newStatus, note });
      toast.success('Attendance corrected and audit log updated');
      setCorrectDrawer(false);
      fetchRecords();
    } catch { toast.error('Correction failed'); }
    setCorreating(false);
  };

  const filtered = records.filter(r =>
    !search || r.student?.full_name?.toLowerCase().includes(search.toLowerCase()) || r.student?.student_id?.includes(search)
  );

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader title="Attendance Records" subtitle={`${total} records${sessionId ? ' for this session' : ''}`} />
      <div className="p-6 flex flex-col gap-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="Search by student name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon="search"
            className="max-w-xs"
          />
          <Select
            placeholder="All Statuses"
            options={[
              { value: 'PRESENT', label: 'Present' },
              { value: 'LATE', label: 'Late' },
              { value: 'ABSENT', label: 'Absent' },
              { value: 'VERIFY', label: 'Verify Required' },
            ]}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-48"
          />
        </div>

        <BentoCard>
          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon="fact_check" title="No attendance records found" description="Records will appear after class sessions are held." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant">
                    {['Student', 'Subject', 'Date & Time', 'Score', 'Status', 'Verified', 'Method', 'Edit'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-on-surface-variant uppercase first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                      <td className="py-3 px-3 first:pl-0">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.student?.full_name || '?'} size="sm" />
                          <div>
                            <p className="font-semibold text-on-surface">{r.student?.full_name ?? '—'}</p>
                            <p className="text-xs text-on-surface-variant">{r.student?.student_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant">{r.session?.subject?.name ?? '—'}</td>
                      <td className="py-3 px-3 text-on-surface font-medium">{formatDateTime(r.timestamp)}</td>
                      <td className="py-3 px-3 font-mono text-sm text-on-surface-variant">
                        {r.recognition_score != null ? `${(r.recognition_score * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
                      <td className="py-3 px-3">
                        {r.is_verified ? (
                          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">verified</span> Yes
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-3 text-xs text-on-surface-variant">{r.marked_method?.replace(/_/g, ' ') ?? '—'}</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => openCorrect(r)}
                          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                          title="Manual Correction"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </BentoCard>
      </div>

      {/* Manual Correction Drawer */}
      <Drawer open={correctDrawer} onClose={() => setCorrectDrawer(false)} title="Manual Attendance Correction">
        {selectedRecord && (
          <div className="flex flex-col gap-5">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-sm font-semibold text-amber-800">Faculty Manual Override</p>
              <p className="text-xs text-amber-700 mt-1">This change will be logged in the audit trail with your credentials and timestamp.</p>
            </div>

            <div className="flex items-center gap-3">
              <Avatar name={selectedRecord.student?.full_name || '?'} size="md" />
              <div>
                <p className="font-semibold text-on-surface">{selectedRecord.student?.full_name}</p>
                <p className="text-sm text-on-surface-variant">{selectedRecord.student?.student_id}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Recorded: {formatDateTime(selectedRecord.timestamp)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-outline-variant text-sm">
              <span>Current status:</span>
              <StatusBadge status={selectedRecord.status} />
            </div>

            <Select
              label="New Status"
              options={[
                { value: 'PRESENT', label: 'Present' },
                { value: 'LATE', label: 'Late' },
                { value: 'ABSENT', label: 'Absent' },
              ]}
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-on-surface">Reason for Correction *</label>
              <textarea
                className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none"
                rows={3}
                placeholder="Briefly describe the reason for this correction..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCorrectDrawer(false)} className="flex-1">Cancel</Button>
              <Button
                loading={correcting}
                onClick={handleCorrect}
                disabled={!note.trim()}
                className="flex-1"
              >
                Save Correction
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading Attendance Ledger..." /></div>}>
      <AttendanceContent />
    </Suspense>
  );
}
