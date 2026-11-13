'use client';
import { useEffect, useState } from 'react';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { recognitionAPI } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { RecognitionEvent } from '@/types';

export default function RecognitionLogsPage() {
  const [events, setEvents] = useState<RecognitionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recognitionAPI.list({ limit: 100 }).then(res => { setEvents(res.data.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader title="Recognition Logs" subtitle="Raw AI recognition event stream from all sessions" />
      <div className="p-6">
        <BentoCard>
          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : events.length === 0 ? (
            <EmptyState icon="face" title="No recognition events yet" description="Recognition events will appear here after sessions are started." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant">
                    {['Timestamp', 'Candidate', 'Score', 'Result', 'Session'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-on-surface-variant uppercase first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id} className="border-b border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                      <td className="py-3 px-3 first:pl-0 font-mono text-xs text-on-surface">{formatDateTime(e.timestamp)}</td>
                      <td className="py-3 px-3 text-on-surface">{e.candidate_student?.full_name ?? <span className="text-on-surface-variant italic">Unknown</span>}</td>
                      <td className="py-3 px-3 font-mono text-sm">
                        {e.recognition_score != null ? `${(e.recognition_score * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-3 px-3"><StatusBadge status={e.result_state} /></td>
                      <td className="py-3 px-3 text-xs text-on-surface-variant font-mono">{e.session_id.slice(0, 8)}…</td>
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
