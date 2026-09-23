import type { RelationKind } from '@/lib/types';

const STYLES: Record<RelationKind, string> = {
  corroborates: 'border-emerald-400/30 text-emerald-200',
  contradicts: 'border-red-400/30 text-red-200',
  unrelated: 'border-muted-steel/40 text-muted-steel',
};

export function RelationBadge({ relation }: { relation: RelationKind }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border bg-void-black px-2 py-0.5 text-[10px] font-medium ${STYLES[relation]}`}
    >
      {relation}
    </span>
  );
}
