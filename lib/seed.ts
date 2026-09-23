import { compareIncidentReports } from '@/lib/comparison';
import { getServiceClient } from '@/lib/db';
import { recomputeLocationSignal } from '@/lib/pipeline';
import { SEED_LOCATIONS, SEED_REPORTS } from '@/lib/seed-data';

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function runSeed(): Promise<{
  locations: number;
  reports: number;
  relations: number;
}> {
  const db = getServiceClient();
  const now = Date.now();

  // Idempotent reset: remove prior seed data for the managed locations.
  const { data: existing } = await db.from('locations').select('id').in('name', SEED_LOCATIONS);
  const existingIds = (existing ?? []).map((l) => l.id as string);
  if (existingIds.length > 0) {
    const { data: oldReports } = await db
      .from('reports')
      .select('id')
      .in('location_id', existingIds);
    const oldIds = (oldReports ?? []).map((r) => r.id as string);
    if (oldIds.length > 0) {
      await db.from('report_relations').delete().in('report_a_id', oldIds);
      await db.from('report_relations').delete().in('report_b_id', oldIds);
      await db.from('reports').delete().in('id', oldIds);
    }
    await db.from('incident_signals').delete().in('location_id', existingIds);
  }
  for (const name of SEED_LOCATIONS) {
    await db.from('locations').upsert({ name }, { onConflict: 'name' });
  }
  const { data: locations } = await db
    .from('locations')
    .select('id,name')
    .in('name', SEED_LOCATIONS);
  const byName = new Map(
    ((locations ?? []) as Array<{ id: string; name: string }>).map((l) => [l.name, l.id])
  );

  let reportCount = 0;
  let relationCount = 0;
  const insertedByLocation = new Map<string, Array<{ id: string; raw_text: string }>>();

  for (const seed of SEED_REPORTS) {
    const locationId = byName.get(seed.location);
    if (!locationId) continue;
    const reportedAt = new Date(now - seed.minutesAgo * 60_000).toISOString();
    const { data, error } = await db
      .from('reports')
      .insert({
        raw_text: seed.raw_text,
        location_raw: seed.location,
        location_id: locationId,
        incident_type: seed.incident_type,
        extracted_confidence: seed.confidence,
        event_time_reference: seed.event_time_reference,
        reported_at: reportedAt,
        source_label: seed.source_label,
        status: 'processed',
      })
      .select('id,raw_text')
      .single();
    if (error || !data) continue;
    reportCount += 1;
    const row = data as { id: string; raw_text: string };
    const siblings = insertedByLocation.get(seed.location) ?? [];
    // Pairwise comparison through the real comparison pipeline.
    for (const sibling of siblings) {
      try {
        const compared = await compareIncidentReports(sibling.raw_text, row.raw_text);
        const [a, b] = orderedPair(sibling.id, row.id);
        const { error: relError } = await db.from('report_relations').upsert(
          {
            report_a_id: a,
            report_b_id: b,
            relation: compared.relation,
            rationale: compared.rationale,
          },
          { onConflict: 'report_a_id,report_b_id' }
        );
        if (!relError) relationCount += 1;
      } catch {
        continue;
      }
    }
    siblings.push(row);
    insertedByLocation.set(seed.location, siblings);
  }

  const signalNow = new Date();
  for (const id of byName.values()) {
    await recomputeLocationSignal(db, id, signalNow);
  }
  return { locations: byName.size, reports: reportCount, relations: relationCount };
}
