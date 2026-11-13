import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  trendUp?: boolean;
  color?: 'default' | 'green' | 'amber' | 'red' | 'purple' | 'blue';
  subtitle?: string;
}

const colorMap = {
  default: { icon: 'bg-primary/10 text-primary', value: 'text-on-surface' },
  green: { icon: 'bg-green-100 text-green-700', value: 'text-green-700' },
  amber: { icon: 'bg-amber-100 text-amber-700', value: 'text-amber-700' },
  red: { icon: 'bg-red-100 text-red-700', value: 'text-red-700' },
  purple: { icon: 'bg-purple-100 text-purple-700', value: 'text-purple-700' },
  blue: { icon: 'bg-blue-100 text-blue-700', value: 'text-blue-700' },
};

export function MetricCard({ title, value, icon, trend, trendUp, color = 'default', subtitle }: MetricCardProps) {
  const colors = colorMap[color];
  return (
    <div className="bento-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-on-surface-variant">{title}</p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', colors.icon)}>
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </div>
      </div>
      <div>
        <p className={cn('text-3xl font-bold', colors.value)}>{value}</p>
        {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
      </div>
      {trend && (
        <p className={cn('text-xs font-medium flex items-center gap-1', trendUp ? 'text-green-600' : 'text-red-500')}>
          <span className="material-symbols-outlined text-sm">{trendUp ? 'trending_up' : 'trending_down'}</span>
          {trend}
        </p>
      )}
    </div>
  );
}
