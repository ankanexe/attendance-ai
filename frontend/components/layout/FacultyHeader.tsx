'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';

interface FacultyHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function FacultyHeader({ title, subtitle, actions }: FacultyHeaderProps) {
  const { user } = useAuth();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-outline-variant px-6 h-16 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-on-surface">{title}</h1>
        {subtitle && <p className="text-xs text-on-surface-variant">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-sm font-semibold text-on-surface">{timeStr}</span>
          <span className="text-xs text-on-surface-variant">{dateStr}</span>
        </div>

        <Link href="/camera-setup" title="Camera Setup">
          <button className="w-9 h-9 rounded-xl border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-xl text-on-surface-variant">videocam</span>
          </button>
        </Link>

        <div className="flex items-center gap-2 pl-2 border-l border-outline-variant">
          {user && <Avatar name={user.full_name} size="sm" />}
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-on-surface leading-none">{user?.full_name || 'Faculty'}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{user?.email}</p>
          </div>
        </div>

        {actions && <div className="flex items-center gap-2 pl-2 border-l border-outline-variant">{actions}</div>}
      </div>
    </header>
  );
}