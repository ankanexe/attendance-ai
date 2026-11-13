'use client';
import { useEffect, useState } from 'react';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { auditAPI } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { AuditLog } from '@/types';

const ACTION_ICONS: Record<string, string> = {
  LOGIN: 'login', LOGOUT: 'logout', SESSION_START: 'play_circle', SESSION_END: 'stop_circle',
  FACE_REGISTERED: 'face', ATTENDANCE_VERIFIED: 'verified', MANUAL_CORRECTION: 'edit',
  REPORT_EXPORTED: 'download', SETTINGS_CHANGE: 'settings',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditAPI.list({ limit: 100 }).then(res => { setLogs(res.data.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader title="Audit Logs" subtitle="Complete audit trail of all system actions" />
      <div className="p-6">
        <BentoCard>
          {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : logs.length === 0 ? (
            <EmptyState icon="history_edu" title="No audit logs yet" description="Audit logs are created automatically for all important actions." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant">
                    {['Timestamp', 'User', 'Action', 'Details'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-on-surface-variant uppercase first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-b border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                      <td className="py-3 px-3 first:pl-0 font-mono text-xs text-on-surface">{formatDateTime(l.timestamp)}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={l.user?.full_name || '?'} size="sm" />
                          <span className="text-sm text-on-surface">{l.user?.full_name ?? 'System'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base text-on-surface-variant">
                            {ACTION_ICONS[l.action] || 'info'}
                          </span>
                          <span className="text-xs font-mono bg-surface-container px-2 py-0.5 rounded-lg">{l.action.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-on-surface-variant max-w-xs truncate">
                        {l.details_json ? JSON.stringify(JSON.parse(l.details_json)).slice(0, 80) : '—'}
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
