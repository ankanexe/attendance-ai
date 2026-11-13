'use client';
import { useEffect, useState } from 'react';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { analyticsAPI } from '@/lib/api';
import type { AIInsight } from '@/types';

const severityConfig: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  LOW: { icon: 'info', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  MEDIUM: { icon: 'warning', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  HIGH: { icon: 'error', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.insights().then(res => { setInsights(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader title="AI Insights" subtitle="Explainable rule-based intelligence from your attendance data" />
      <div className="p-6 flex flex-col gap-4">
        <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-sm text-blue-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">info</span>
          All insights are generated from real attendance data using rule-based logic. No black-box AI is used here.
        </div>

        {insights.length === 0 ? (
          <EmptyState icon="psychology" title="No insights yet" description="Insights are generated after attendance sessions are held. Start a session to generate insights." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map(ins => {
              const cfg = severityConfig[ins.severity] || severityConfig.LOW;
              return (
                <div key={ins.id} className={`bento-card border ${cfg.border} flex gap-4`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <span className={`material-symbols-outlined text-xl ${cfg.text}`}>{cfg.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-on-surface">{ins.title}</h3>
                      {ins.metric != null && (
                        <span className={`text-lg font-black ${cfg.text}`}>{ins.metric}</span>
                      )}
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{ins.description}</p>
                    <p className="text-xs text-on-surface-variant/60 mt-2">
                      {new Date(ins.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
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
