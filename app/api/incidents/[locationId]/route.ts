import { NextResponse } from 'next/server';
import { getPublicClient, getServiceClient, isDbConfigured } from '@/lib/db';
import { CORROBORATION_WINDOW_MS } from '@/lib/signal';
import type { Report, ReportRelation } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locationId: string }> }
) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }
  const { locationId } = await params;
  if (!locationId) {
    return NextResponse.json({ error: 'locationId is required' }, { status: 400 });
  }
  try {
    const db = process.env.SUPABASE_SECRET_KEY ? getServiceClient() : getPublicClient();
    const { data: location, error: locError } = await db
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .single();
    if (locError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const windowStart = new Date(Date.now() - CORROBORATION_WINDOW_MS).toISOString();
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
      relations = ((rels ?? []) as ReportRelation[]).filter(
        (r) => ids.includes(r.report_a_id) && ids.includes(r.report_b_id)
      );
    }
    const { data: signal } = await db
      .from('incident_signals')
      .select('*')
      .eq('location_id', locationId)
      .single();
    return NextResponse.json({
      location,
      signal: signal ?? null,
      reports: rows,
      relations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load evidence';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
