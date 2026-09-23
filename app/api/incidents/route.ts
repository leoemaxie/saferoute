import { NextResponse } from 'next/server';
import { getPublicClient, getServiceClient, isDbConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ incidents: [] });
  }
  try {
    const db = process.env.SUPABASE_SECRET_KEY ? getServiceClient() : getPublicClient();
    const { data: signals, error } = await db
      .from('incident_signals')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);

    const locationIds = (signals ?? []).map((s) => s.location_id as string);
    let locations: Array<{ id: string; name: string; created_at: string }> = [];

    if (locationIds.length > 0) {
      const { data, error: locError } = await db
        .from('locations')
        .select('*')
        .in('id', locationIds);
      if (locError) throw new Error(locError.message);
      locations = (data ?? []) as typeof locations;
    }

    const byId = new Map(locations.map((l) => [l.id, l]));
    const incidents = (signals ?? [])
      .map((signal) => ({ location: byId.get(signal.location_id), signal }))
      .filter((item) => item.location);
    return NextResponse.json({ incidents });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load feed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
