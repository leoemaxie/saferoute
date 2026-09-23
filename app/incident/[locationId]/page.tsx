import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EvidenceReport } from '@/components/evidence-report';
import { SignalBadge } from '@/components/signal-badge';
import { TopNav } from '@/components/top-nav';
import type { EvidenceDetail } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function loadEvidence(locationId: string): Promise<EvidenceDetail | null> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const res = await fetch(`${base}/api/incidents/${locationId}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load evidence');
  return (await res.json()) as EvidenceDetail;
}

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  const detail = await loadEvidence(locationId);
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
        <Link href="/" className="text-[14px] text-periwinkle-glow">
          ← Back to dashboard
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[36px] font-medium text-pure-white">
            {detail.location.name}
          </h1>
          {detail.signal && <SignalBadge signal={detail.signal.signal} />}
        </div>
        <p className="mt-2 max-w-[640px] text-[16px] text-frost">
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
