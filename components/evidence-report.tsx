import { RelationBadge } from './relation-badge';
import { formatFullTime, formatRelativeTime } from '@/lib/format';
import type { Report, ReportRelation } from '@/lib/types';

export function EvidenceReport({
  report,
  relations,
  peers,
}: {
  report: Report;
  relations: ReportRelation[];
  peers: Map<string, string>;
}) {
  return (
    <article className="rounded-2xl border border-gunmetal bg-carbon-surface p-5">
      <p className="text-[14px] leading-[1.55] text-pure-white">“{report.raw_text}”</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {report.incident_type && (
          <span className="rounded-full border border-gunmetal px-2 py-0.5 text-[10px] text-frost">
            {report.incident_type}
          </span>
        )}
        {report.status === 'error' && (
          <span className="rounded-full border border-red-400/30 px-2 py-0.5 text-[10px] text-red-200">
            needs review
          </span>
        )}
        {relations.map((rel) => (
          <span key={rel.id} className="inline-flex items-center gap-1">
            <RelationBadge relation={rel.relation} />
          </span>
        ))}
      </div>
      {relations.map((rel) => (
        <p key={`${rel.id}-why`} className="mt-1 text-[12px] text-muted-steel">
          vs. “
          {(
            peers.get(rel.report_a_id === report.id ? rel.report_b_id : rel.report_a_id) ?? ''
          ).slice(0, 80)}
          …” — {rel.rationale}
        </p>
      ))}
      <p className="mt-2 text-[12px] text-muted-steel" title={formatFullTime(report.reported_at)}>
        {formatRelativeTime(report.reported_at)}
        {report.event_time_reference ? ` · reported as “${report.event_time_reference}”` : ''}
        {' · '}source: {report.source_label}
      </p>
    </article>
  );
}
