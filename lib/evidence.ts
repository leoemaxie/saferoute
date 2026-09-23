import { getPublicClient, getServiceClient, isDbConfigured } from '@/lib/db';
import { CORROBORATION_WINDOW_MS } from '@/lib/signal';
import type { EvidenceDetail, IncidentSignal, Location, Report, ReportRelation } from '@/lib/types';

export async function getEvidence(locationId: string): Promise<EvidenceDetail | null> {
  if (!isDbConfigured() || !locationId) {
    return null;
  }

  try {
    const db = process.env.SUPABASE_SECRET_KEY ? getServiceClient() : getPublicClient();

    const { data: location, error: locError } = await db
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .maybeSingle();

    if (locError || !location) {
      return null;
    }

    const windowStart = new Date(Date.now() - CORROBORATION_WINDOW_MS).toISOString();
    const { data: reports, error: reportsError } = await db
      .from('reports')
      .select('*')
      .eq('location_id', locationId)
      .gte('reported_at', windowStart)
      .order('reported_at', { ascending: false });

    if (reportsError) {
      throw new Error(reportsError.message);
    }

    const rows = (reports ?? []) as Report[];
    const ids = rows.map((r) => r.id);
    let relations: ReportRelation[] = [];

    if (ids.length > 0) {
      const { data: rels, error: relError } = await db
        .from('report_relations')
        .select('*')
        .or(ids.map((id) => `report_a_id.eq.${id},report_b_id.eq.${id}`).join(','));

      if (relError) {
        throw new Error(relError.message);
      }

      relations = ((rels ?? []) as ReportRelation[]).filter(
        (r) => ids.includes(r.report_a_id) && ids.includes(r.report_b_id)
      );
    }

    const { data: signal } = await db
      .from('incident_signals')
      .select('*')
      .eq('location_id', locationId)
      .maybeSingle();

    return {
      location: location as Location,
      signal: (signal as IncidentSignal) ?? null,
      reports: rows,
      relations,
    };
  } catch (err) {
    console.error('Error fetching incident evidence:', err);
    throw err;
  }
}
