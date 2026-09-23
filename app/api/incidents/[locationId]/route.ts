import { NextResponse } from 'next/server';
import { isDbConfigured } from '@/lib/db';
import { getEvidence } from '@/lib/evidence';

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
    const detail = await getEvidence(locationId);
    if (!detail) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load evidence';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
