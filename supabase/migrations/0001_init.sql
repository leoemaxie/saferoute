-- SafeRoute initial schema (BUILDSPEC.md Section 4)
-- Apply via Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  location_id uuid references locations(id) on delete set null,
  location_raw text not null,
  incident_type text,
  extracted_confidence text,
  reported_at timestamptz not null default now(),
  event_time_reference text,
  source_label text default 'community',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists reports_location_id_idx on reports (location_id);
create index if not exists reports_reported_at_idx on reports (reported_at desc);

create table if not exists incident_signals (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade unique,
  signal text not null,
  summary text not null,
  report_count int not null default 0,
  contradiction_count int not null default 0,
  last_report_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists report_relations (
  id uuid primary key default gen_random_uuid(),
  report_a_id uuid references reports(id) on delete cascade,
  report_b_id uuid references reports(id) on delete cascade,
  relation text not null,
  rationale text,
  created_at timestamptz not null default now(),
  unique (report_a_id, report_b_id)
);
create index if not exists report_relations_a_idx on report_relations (report_a_id);
create index if not exists report_relations_b_idx on report_relations (report_b_id);

-- Permissive read for anonymous dashboard; writes go through service key in API routes.
alter table locations enable row level security;
alter table reports enable row level security;
alter table incident_signals enable row level security;
alter table report_relations enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'public read locations') then
    create policy "public read locations" on locations for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'public read reports') then
    create policy "public read reports" on reports for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'public read signals') then
    create policy "public read signals" on incident_signals for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'public read relations') then
    create policy "public read relations" on report_relations for select using (true);
  end if;
end
$$;
