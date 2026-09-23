import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EvidenceReport } from '@/components/evidence-report';
import { SignalBadge } from '@/components/signal-badge';
import { TopNav } from '@/components/top-nav';
import { getEvidence } from '@/lib/evidence';

export const dynamic = 'force-dynamic';

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  const detail = await getEvidence(locationId);
  if (!detail) notFound();

  const peers = new Map(detail.reports.map((r) => [r.id, r.raw_text]));
  const byReport = new Map<string, typeof detail.relations>();

  for (const rel of detail.relations) {
    for (const id of [rel.report_a_id, rel.report_b_id]) {
      const list = byReport.get(id) ?? [];
      list.push(rel);
      byReport.set(id, list);
    }
  }

  return (
    <div className="min-h-screen bg-void-black">
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-5 pb-20 pt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[14px] text-periwinkle-glow transition-colors hover:text-pure-white"
        >
          ← Back to signals console
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[36px] font-medium leading-[1.17] text-pure-white">
            {detail.location.name}
          </h1>
          {detail.signal && <SignalBadge signal={detail.signal.signal} />}
        </div>
        <p className="mt-2 max-w-[640px] text-[16px] leading-[1.6] text-frost">
          {detail.signal?.summary ??
            'No verified incident has been reported on this route in the last 3 hours.'}
        </p>
        <h2 className="mb-3 mt-8 text-[20px] font-medium text-pure-white">
          Evidence ({detail.reports.length} report
          {detail.reports.length === 1 ? '' : 's'})
        </h2>
        {detail.reports.length === 0 ? (
          <p className="text-[14px] text-muted-steel">No reports in the active 3-hour window.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {detail.reports.map((report) => (
              <EvidenceReport
                key={report.id}
                report={report}
                relations={byReport.get(report.id) ?? []}
                peers={peers}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
