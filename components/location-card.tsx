import Link from 'next/link';
import { SignalBadge } from './signal-badge';
import { formatRelativeTime } from '@/lib/format';
import type { IncidentFeedItem } from '@/lib/types';

export function LocationCard({ item }: { item: IncidentFeedItem }) {
  const { location, signal } = item;
  return (
    <article className="rounded-[16px] border border-gunmetal bg-carbon-surface p-5 transition-colors hover:border-steel-border/50">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[20px] font-medium leading-[1.45] text-pure-white">{location.name}</h3>
        {signal && <SignalBadge signal={signal.signal} />}
      </div>
      <p className="mt-2.5 min-h-[44px] text-[14px] leading-[1.55] text-frost">
        {signal?.summary ?? 'No verified incident has been reported on this route recently.'}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-gunmetal/60 pt-3 text-[12px] text-muted-steel">
        <span>
          {signal
            ? `${signal.report_count} report${signal.report_count === 1 ? '' : 's'} · updated ${formatRelativeTime(signal.updated_at)}`
            : 'No signal yet'}
        </span>
        <Link
          href={`/incident/${location.id}`}
          className="font-medium text-periwinkle-glow transition-colors hover:text-pure-white"
        >
          View evidence →
        </Link>
      </div>
    </article>
  );
}
