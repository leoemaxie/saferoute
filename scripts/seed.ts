// Idempotent baseline seed. Usage: pnpm seed
// Requires Supabase server env vars; runs the real comparison pipeline
// so seeding also validates end-to-end execution.
import { loadEnvConfig } from '@next/env';
import { runSeed } from '../lib/seed';

loadEnvConfig(process.cwd());

async function main() {
  const result = await runSeed();
  console.log(
    `Seeded ${result.locations} locations, ${result.reports} reports, ${result.relations} relations.`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
