'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/todays-classes', icon: 'event_available', label: "Today's Classes" },
  { href: '/live-attendance', icon: 'videocam', label: 'Live Attendance' },
  { href: '/students', icon: 'group', label: 'Students' },
  { href: '/subjects', icon: 'menu_book', label: 'Subjects' },
  { href: '/sessions', icon: 'calendar_month', label: 'Sessions' },
  { href: '/attendance', icon: 'fact_check', label: 'Attendance' },
  { href: '/analytics', icon: 'analytics', label: 'Analytics' },
  { href: '/recognition-logs', icon: 'face', label: 'Recognition Logs' },
  { href: '/anomalies', icon: 'warning', label: 'Anomalies' },
  { href: '/reports', icon: 'summarize', label: 'Reports' },
  { href: '/audit-logs', icon: 'history_edu', label: 'Audit Logs' },
];

const settingsItems = [
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

export function FacultySidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <nav className="fixed left-0 top-0 h-full w-64 flex flex-col bg-white border-r border-outline-variant z-40 shadow-sm">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-outline-variant/50">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
          <span className="text-white font-black text-xl">A</span>
        </div>
        <div>
          <h1 className="font-bold text-lg text-primary leading-none">AttendAI</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Faculty Portal</p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive(item.href)
                ? 'bg-primary/10 text-primary font-semibold border-r-[3px] border-primary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            )}
          >
            <span className={cn(
              'material-symbols-outlined text-xl',
              isActive(item.href) && '[font-variation-settings:"FILL"_1]'
            )}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}

        <div className="mt-2 pt-2 border-t border-outline-variant/50">
          {settingsItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive(item.href)
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              )}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-outline-variant/50">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors duration-150"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          Logout
        </button>
      </div>
    </nav>
  );
}