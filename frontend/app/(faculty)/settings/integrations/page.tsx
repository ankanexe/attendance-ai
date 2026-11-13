'use client';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader title="College Portal Integration" subtitle="Architecture and future sync configuration" />
      <div className="p-6 flex flex-col gap-6 max-w-3xl">
        {/* Status banner */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container border border-outline-variant">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-gray-400 text-xl">link_off</span>
          </div>
          <div>
            <p className="font-semibold text-on-surface">Connection Status: <span className="text-on-surface-variant font-normal">Not Connected</span></p>
            <p className="text-sm text-on-surface-variant">Mode: Local Demo — All data stored locally, no external sync</p>
          </div>
        </div>

        {/* Architecture diagram */}
        <BentoCard title="Integration Architecture">
          <div className="flex flex-col items-center gap-3 py-4 font-mono text-sm">
            {[
              { label: 'AttendAI (Local)', icon: 'psychology', color: 'bg-primary/10 border-primary text-primary' },
              { arrow: true },
              { label: 'Integration Layer (Planned)', icon: 'transform', color: 'bg-surface-container border-outline-variant text-on-surface-variant' },
              { arrow: true },
              { label: 'College ERP / SIS Portal', icon: 'school', color: 'bg-surface-container border-outline-variant text-on-surface-variant' },
            ].map((item, i) => (
              'arrow' in item ? (
                <div key={i} className="flex flex-col items-center text-on-surface-variant gap-0.5">
                  <div className="w-px h-4 bg-outline-variant" />
                  <span className="material-symbols-outlined text-sm">arrow_downward</span>
                  <div className="w-px h-4 bg-outline-variant" />
                </div>
              ) : (
                <div key={i} className={`px-6 py-3 rounded-2xl border-2 flex items-center gap-3 w-64 justify-center ${item.color}`}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
              )
            ))}
          </div>
        </BentoCard>

        {/* Planned sync modules */}
        <BentoCard title="Planned Synchronization Modules">
          {[
            { icon: 'person', label: 'Student Sync', desc: 'Import student roster from college database automatically' },
            { icon: 'menu_book', label: 'Subject Sync', desc: 'Sync subjects, sections, and timetables from SIS' },
            { icon: 'fact_check', label: 'Attendance Export', desc: 'Push attendance records to college portal daily' },
            { icon: 'lock', label: 'Authentication Sync', desc: 'SSO with college credentials via OAuth/SAML' },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-4 py-3 border-b border-outline-variant last:border-0">
              <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-on-surface-variant text-base">{m.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-on-surface">{m.label}</p>
                <p className="text-xs text-on-surface-variant">{m.desc}</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-medium">Planned</span>
            </div>
          ))}
        </BentoCard>
      </div>
    </div>
  );
}
