import { cn, statusLabel } from '@/lib/utils';

type Status = 'PRESENT' | 'LATE' | 'ABSENT' | 'VERIFY' | 'UNKNOWN' |
  'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED' |
  'MATCHED' | 'AMBIGUOUS' | 'LOW' | 'MEDIUM' | 'HIGH';

const statusStyles: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-800',
  LATE: 'bg-amber-100 text-amber-800',
  ABSENT: 'bg-red-100 text-red-800',
  VERIFY: 'bg-purple-100 text-purple-800',
  UNKNOWN: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-800',
  UPCOMING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
  MATCHED: 'bg-green-100 text-green-800',
  AMBIGUOUS: 'bg-amber-100 text-amber-800',
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-red-100 text-red-800',
};

interface StatusBadgeProps {
  status: Status | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'badge',
      statusStyles[status] || 'bg-gray-100 text-gray-600',
      className
    )}>
      {statusLabel(status)}
    </span>
  );
}
