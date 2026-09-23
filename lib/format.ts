export function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'no reports yet';

  const t = new Date(iso).getTime();

  if (Number.isNaN(t)) return 'unknown time';

  const diffMs = Date.now() - t;
  const mins = Math.max(0, Math.round(diffMs / 60000));

  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;

  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatFullTime(iso: string | null): string {
  if (!iso) return '';

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return '';

  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
