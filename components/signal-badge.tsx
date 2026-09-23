import type { SignalState } from '@/lib/types';

const CONFIG: Record<SignalState, { dot: string; label: string; ring: string }> = {
  CLEAR: { dot: 'bg-emerald-400', label: 'Clear', ring: 'border-emerald-400/30' },
  CAUTION: { dot: 'bg-amber-300', label: 'Caution', ring: 'border-amber-300/30' },
  UNVERIFIED: { dot: 'bg-orange-400', label: 'Unverified', ring: 'border-orange-400/30' },
  CONFIRMED: { dot: 'bg-red-400', label: 'Confirmed', ring: 'border-red-400/30' },
  STALE: { dot: 'bg-muted-steel', label: 'Stale', ring: 'border-muted-steel/40' },
};

export function SignalBadge({ signal }: { signal: SignalState }) {
  const { dot, label, ring } = CONFIG[signal];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border ${ring} bg-void-black px-3 py-1 text-[12px] font-medium text-frost`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
