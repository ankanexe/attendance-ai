export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

export function formatScore(score?: number): string {
  if (score == null) return '—';
  return `${(score * 100).toFixed(1)}%`;
}

export function getAvatarColor(name: string): string {
  const colors = [
    'bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-teal-500',
    'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PRESENT: 'Present', LATE: 'Late', ABSENT: 'Absent',
    VERIFY: 'Verify', UNKNOWN: 'Unknown',
    ACTIVE: 'Active', UPCOMING: 'Upcoming', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
    MATCHED: 'Matched', AMBIGUOUS: 'Ambiguous',
  };
  return map[status] || status;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
