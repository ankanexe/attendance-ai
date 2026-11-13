import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function BentoCard({ children, className, title, subtitle, action }: BentoCardProps) {
  return (
    <div className={cn('bento-card', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-base font-semibold text-on-surface">{title}</h3>}
            {subtitle && <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}