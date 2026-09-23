import { NextResponse } from 'next/server';
import { isDbConfigured } from '@/lib/db';
import { ingestReport } from '@/lib/pipeline';

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured. Set Supabase env vars.' },
      { status: 503 }
    );
  }
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const raw_text = typeof payload.raw_text === 'string' ? payload.raw_text : '';
  const location_raw = typeof payload.location_raw === 'string' ? payload.location_raw : '';
  const source_label =
    typeof payload.source_label === 'string' ? payload.source_label : 'community';

  if (!raw_text.trim() || !location_raw.trim()) {
    return NextResponse.json({ error: 'raw_text and location_raw are required' }, { status: 400 });
  }
  if (raw_text.length > 2000 || location_raw.length > 200) {
    return NextResponse.json(
      { error: 'Report text or location exceeds length limits' },
      { status: 400 }
    );
  }

  try {
    const result = await ingestReport({ raw_text, location_raw, source_label });
    return NextResponse.json({ report: result.report, signal: result.signal }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ingestion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
