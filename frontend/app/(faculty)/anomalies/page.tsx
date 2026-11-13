'use client';
import { useEffect, useState } from 'react';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { anomaliesAPI } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Anomaly } from '@/types';
import toast from 'react-hot-toast';

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try { const r = await anomaliesAPI.list({ limit: 100 }); setAnomalies(r.data.items || []); } catch { }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const resolve = async (id: string) => {
    try { await anomaliesAPI.resolve(id); toast.success('Anomaly resolved'); fetch(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader title="Anomalies" subtitle="Flagged attendance irregularities requiring attention" />
      <div className="p-6">
        <BentoCard>
          {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : anomalies.length === 0 ? (
            <EmptyState icon="verified_user" title="No anomalies detected" description="The system will flag unusual attendance patterns here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant">
                    {['Severity', 'Type', 'Student', 'Description', 'Timestamp', 'Status', 'Action'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-on-surface-variant uppercase first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map(a => (
                    <tr key={a.id} className="border-b border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                      <td className="py-3 px-3 first:pl-0"><StatusBadge status={a.severity} /></td>
                      <td className="py-3 px-3 text-xs text-on-surface-variant">{a.anomaly_type.replace(/_/g, ' ')}</td>
                      <td className="py-3 px-3 text-on-surface">{a.student?.full_name ?? '—'}</td>
                      <td className="py-3 px-3 text-on-surface-variant max-w-xs truncate">{a.description}</td>
                      <td className="py-3 px-3 font-mono text-xs">{formatDateTime(a.timestamp)}</td>
                      <td className="py-3 px-3">
                        <span className={`badge ${a.is_resolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {a.is_resolved ? 'Resolved' : 'Open'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {!a.is_resolved && (
                          <Button size="sm" variant="outline" onClick={() => resolve(a.id)}>Resolve</Button>
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
