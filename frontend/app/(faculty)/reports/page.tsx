'use client';
import { useState } from 'react';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { reportsAPI } from '@/lib/api';
import { downloadBlob } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportType, setReportType] = useState('daily');
  const [loading, setLoading] = useState(false);

  const exportReport = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.export({ date_from: dateFrom, date_to: dateTo, report_type: reportType });
      downloadBlob(res.data, `attendai_${reportType}_report_${dateFrom}_${dateTo}.csv`);
      toast.success('Report exported successfully');
    } catch { toast.error('Failed to generate report'); }
    setLoading(false);
  };

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader title="Reports" subtitle="Export attendance data in CSV format" />
      <div className="p-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
        <BentoCard title="Export Configuration">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <Input label="Date To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <Select
              label="Report Type"
              options={[
                { value: 'daily', label: 'Daily Attendance Report' },
                { value: 'subject', label: 'Subject Summary Report' },
                { value: 'student', label: 'Student Attendance Report' },
                { value: 'section', label: 'Section Report' },
              ]}
              value={reportType}
              onChange={e => setReportType(e.target.value)}
            />
            <Button loading={loading} onClick={exportReport} icon="download" size="lg" className="w-full mt-2">
              Generate & Export CSV
            </Button>
          </div>
        </BentoCard>

        <BentoCard title="Report Types">
          {[
            { type: 'Daily Attendance', icon: 'today', desc: 'All attendance records for the selected date range.' },
            { type: 'Subject Summary', icon: 'menu_book', desc: 'Attendance rates per subject broken down by section.' },
            { type: 'Student Report', icon: 'person', desc: 'Per-student attendance history across all subjects.' },
            { type: 'Section Report', icon: 'group', desc: 'Section-wise overview with present/late/absent counts.' },
          ].map(r => (
            <div key={r.type} className="flex items-start gap-3 py-3 border-b border-outline-variant last:border-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-base">{r.icon}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">{r.type}</p>
                <p className="text-xs text-on-surface-variant">{r.desc}</p>
              </div>
            </div>
          ))}
        </BentoCard>
      </div>
    </div>
  );
}
