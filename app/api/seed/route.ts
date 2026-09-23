import { NextResponse } from 'next/server';
import { isDbConfigured } from '@/lib/db';
import { runSeed } from '@/lib/seed';

export async function POST() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    return NextResponse.json({ error: 'Seeding is disabled in production' }, { status: 403 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured. Set Supabase env vars.' },
      { status: 503 }
    );
  }
  try {
    const result = await runSeed();
    return NextResponse.json({ seeded: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Seed failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
