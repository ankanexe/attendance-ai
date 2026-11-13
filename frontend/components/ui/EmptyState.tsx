'use client';
import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl text-on-surface-variant">{icon}</span>
      </div>
      <div>
        <p className="text-base font-semibold text-on-surface">{title}</p>
        {description && <p className="text-sm text-on-surface-variant mt-1 max-w-xs">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
