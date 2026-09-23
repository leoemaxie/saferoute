import Link from 'next/link';
import { SignalBadge } from './signal-badge';
import { formatRelativeTime } from '@/lib/format';
import type { IncidentFeedItem } from '@/lib/types';

export function LocationCard({ item }: { item: IncidentFeedItem }) {
  const { location, signal } = item;
  return (
    <article className="rounded-2xl border border-gunmetal bg-carbon-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[20px] font-medium leading-[1.45] text-pure-white">{location.name}</h3>
        {signal && <SignalBadge signal={signal.signal} />}
      </div>
      <p className="mt-2 min-h-[44px] text-[14px] leading-[1.55] text-frost">
        {signal?.summary ?? 'No verified incident has been reported on this route recently.'}
      </p>
      <div className="mt-3 flex items-center justify-between text-[12px] text-muted-steel">
        <span>
          {signal
            ? `${signal.report_count} report${signal.report_count === 1 ? '' : 's'} · updated ${formatRelativeTime(signal.updated_at)}`
            : 'No signal yet'}
        </span>
        <Link
          href={`/incident/${location.id}`}
          className="font-medium text-periwinkle-glow hover:underline"
        >
          View evidence →
        </Link>
      </div>
    </article>
  );
}
