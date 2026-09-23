import type { SupabaseClient } from '@supabase/supabase-js';
import { compareIncidentReports } from './comparison';
import { getServiceClient } from './db';
import { extractIncidentEntities } from './extraction';
import { findLocationIdByName } from './location';
import { computeSignal, CORROBORATION_WINDOW_MS } from './signal';
import type { IncidentSignal, Report, ReportRelation, SignalState } from './types';

export interface IngestInput {
  raw_text: string;
  location_raw: string;
  source_label?: string;
}

export interface IngestResult {
  report: Report;
  signal: IncidentSignal | null;
  locationId: string;
}

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function recomputeLocationSignal(
  db: SupabaseClient,
  locationId: string,
  now: Date
): Promise<IncidentSignal> {
  const windowStart = new Date(now.getTime() - CORROBORATION_WINDOW_MS).toISOString();
  const { data: reports, error: reportsError } = await db
    .from('reports')
    .select('*')
    .eq('location_id', locationId)
    .gte('reported_at', windowStart)
    .order('reported_at', { ascending: false });
  if (reportsError) throw new Error(reportsError.message);
  const rows = (reports ?? []) as Report[];
  const ids = rows.map((r) => r.id);
  let relations: ReportRelation[] = [];
  if (ids.length > 0) {
    const { data: rels, error: relError } = await db
      .from('report_relations')
      .select('*')
      .or(ids.map((id) => `report_a_id.eq.${id},report_b_id.eq.${id}`).join(','));
    if (relError) throw new Error(relError.message);
    relations = (rels ?? []) as ReportRelation[];
  }
  const result = computeSignal(rows, relations, now);
  const lastReportAt = rows.length > 0 ? rows[0].reported_at : null;
  const { data: upserted, error: upsertError } = await db
    .from('incident_signals')
    .upsert(
      {
        location_id: locationId,
        signal: result.signal as SignalState,
        summary: result.summary,
        report_count: result.reportCount,
        contradiction_count: result.contradictionCount,
        last_report_at: lastReportAt,
        updated_at: now.toISOString(),
      },
      { onConflict: 'location_id' }
    )
    .select('*')
    .single();
  if (upsertError) throw new Error(upsertError.message);
  return upserted as IncidentSignal;
}

export async function ingestReport(input: IngestInput): Promise<IngestResult> {
  const rawText = input.raw_text?.trim() ?? '';
  const locationRaw = input.location_raw?.trim() ?? '';
  if (!rawText) throw new Error('raw_text is required');
  if (!locationRaw) throw new Error('location_raw is required');
  const sourceLabel = input.source_label?.trim() || 'community';

  const db = getServiceClient();
  const now = new Date();

  const { data: inserted, error: insertError } = await db
    .from('reports')
    .insert({
      raw_text: rawText,
      location_raw: locationRaw,
      source_label: sourceLabel,
      status: 'pending',
      reported_at: now.toISOString(),
    })
    .select('*')
    .single();
  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? 'Failed to persist report');
  }
  let report = inserted as Report;

  // Step 1: structured extraction (fault-tolerant).
  let extractionFailed = false;
  try {
    const extracted = await extractIncidentEntities(rawText);
    const { data: updated, error: updateError } = await db
      .from('reports')
      .update({
        incident_type: extracted.incident_type,
        extracted_confidence: extracted.confidence,
        event_time_reference: extracted.event_time_reference,
      })
      .eq('id', report.id)
      .select('*')
      .single();
    if (updateError) throw new Error(updateError.message);
    report = updated as Report;
  } catch {
    extractionFailed = true;
    await db.from('reports').update({ status: 'error' }).eq('id', report.id);
    report = { ...report, status: 'error' };
  }

  // Step 2: resolve location (normalized string match; create if unknown).
  const { data: locations } = await db.from('locations').select('id,name');
  const existingId = findLocationIdByName(locations ?? [], locationRaw);
  let locationId = existingId;
  if (!locationId) {
    const { data: created, error: createError } = await db
      .from('locations')
      .insert({ name: locationRaw })
      .select('id')
      .single();
    if (createError || !created) throw new Error('Failed to create location');
    locationId = (created as { id: string }).id;
  }
  const { data: withLocation } = await db
    .from('reports')
    .update({ location_id: locationId })
    .eq('id', report.id)
    .select('*')
    .single();
  if (withLocation) report = withLocation as Report;

  // Step 3: pairwise comparison against active reports in the window.
  const windowStart = new Date(now.getTime() - CORROBORATION_WINDOW_MS).toISOString();
  const { data: peers } = await db
    .from('reports')
    .select('id,raw_text')
    .eq('location_id', locationId)
    .gte('reported_at', windowStart)
    .neq('id', report.id)
    .order('reported_at', { ascending: false })
    .limit(20);
  for (const peer of (peers ?? []) as Array<{ id: string; raw_text: string }>) {
    try {
      const compared = await compareIncidentReports(peer.raw_text, rawText);
      const [a, b] = orderedPair(peer.id, report.id);
      await db.from('report_relations').upsert(
        {
          report_a_id: a,
          report_b_id: b,
          relation: compared.relation,
          rationale: compared.rationale,
        },
        { onConflict: 'report_a_id,report_b_id' }
      );
    } catch {
      // A single failed comparison must not fail ingestion; continue.
      continue;
    }
  }

  // Step 4: recompute deterministic signal + finalize status.
  const signal = await recomputeLocationSignal(db, locationId, new Date());
  if (!extractionFailed) {
    const { data: processed } = await db
      .from('reports')
      .update({ status: 'processed' })
      .eq('id', report.id)
      .select('*')
      .single();
    if (processed) report = processed as Report;
  }
  return { report, signal, locationId };
}
