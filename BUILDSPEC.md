# SafeRoute — Technical Specification

Status: Production MVP / Core Architecture
Stack: Next.js (App Router) + Supabase (PostgreSQL) + Google Gemini API (@google/genai)
Deploy target: Vercel + Managed Supabase
Package Manager: pnpm

---

## 1. Purpose and Scope

SafeRoute transforms unstructured, informal community incident reports (chat-style text,
Nigerian Pidgin, contradictory or duplicate claims) into transparent, time-sensitive
safety intelligence, accompanied by verifiable evidence explaining system signals.
It intentionally does not declare an area unconditionally "safe." Instead, it reports what
has been documented, degree of corroboration, contradiction indicators, and report recency.

### Core Capabilities (MVP)
- Report submission interface (unstructured text + location string + optional category)
- LLM-powered structured extraction from natural language (location, incident type, confidence, temporal markers)
- Pairwise comparison against active reports within a rolling time window to detect corroboration or contradiction
- Deterministic signal evaluation (🟢 CLEAR, 🟡 CAUTION, 🟠 UNVERIFIED, 🔴 CONFIRMED, ⚪ STALE) computed purely in application logic
- Public incident dashboard displaying real-time signal status per location
- Evidence view for every incident detailing source reports, corroboration links, and reasoning
- Baseline scenario seed dataset providing realistic multi-report corroboration flows out of the box

### Explicitly Deferred Scope
- User account authentication & RBAC (reports are currently anonymous, attributed by display name)
- Interactive GIS/mapping visualization (location is modeled via managed string identifiers; no PostGIS/lat-long clustering yet)
- Dynamic route navigation or detour calculation
- Direct messaging ingestion channels (WhatsApp Business API, SMS webhooks)
- Push notifications / WebSockets (polling is used for updates)
- Audio / voice report transcription
- Multi-language UI localization (ingestion supports multilingual/Pidgin input; UI shell is English)
- Reputation-weighted reporting tiers

---

## 2. Core User Journey

1. **Dashboard Discovery:** A user accesses the dashboard and views active incident feeds per location, showing real-time signal indicators derived from verified reports.
2. **Evidence Inspection:** The user selects "View Evidence" on a location to inspect constituent reports, relative timestamps, and plain-language corroboration/contradiction rationales.
3. **Report Submission:** A community member submits a new report (e.g., *"road don clear for Oke-Odo now"* or *"traffic moving freely"*).
4. **Pipeline Execution:** The backend processes the report:
   - Extracts structured metadata.
   - Compares the report against existing reports within the corroboration window.
   - Recomputes the deterministic safety signal and updates location status.
5. **Real-Time Reflection:** Within the next refresh cycle, the public dashboard and evidence view update to reflect the new report and updated signal state.

---

## 3. Signal States & Evaluation Hierarchy

Signals are strictly deterministic and evaluated by application code, never delegated to an LLM.

| Signal | State | Evaluation Criteria |
|---|---|---|
| 🟢 | **CLEAR** | No active reports in the rolling window, or all recent reports confirm normal conditions |
| 🟡 | **CAUTION** | Active reports exist with partial corroboration but contain contradictions or dispute |
| 🟠 | **UNVERIFIED** | A single isolated report exists with no corroboration or contradiction |
| 🔴 | **CONFIRMED** | Two or more independent, mutually corroborating reports with no unresolved contradictions within the window |
| ⚪ | **STALE** | Most recent incident report exceeds the staleness threshold (default: 90 minutes) |

### Precedence Hierarchy
When multiple condition branches match, precedence is strictly evaluated in order:
1. **STALE** (evaluated first based on recency of the latest report)
2. **CONFIRMED**
3. **CAUTION**
4. **UNVERIFIED**
5. **CLEAR**

---

## 4. Data Model (PostgreSQL / Supabase)

Relational schema designed for efficient ingestion, deterministic evaluation, and transparent auditing.

```sql
-- locations: Managed registry of monitored areas and transit corridors.
-- Matching is performed by normalized string matching.
create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- reports: Ingested community incident reports and structured extraction artifacts.
create table reports (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  location_id uuid references locations(id),
  location_raw text not null, -- raw text supplied by user prior to normalization
  incident_type text,         -- extracted classification: road_disruption, security_concern, all_clear, etc.
  extracted_confidence text,  -- 'low' | 'medium' | 'high' (model extraction confidence)
  reported_at timestamptz not null default now(),
  event_time_reference text,  -- extracted raw temporal phrase (e.g., "just now", "10 mins ago")
  source_label text default 'community', -- classification of reporting source
  status text not null default 'pending', -- 'pending' | 'processed' | 'error'
  created_at timestamptz not null default now()
);

-- incident_signals: Materialized state of current computed signal per location.
-- Recomputed and upserted whenever new reports affecting the location are ingested.
create table incident_signals (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) unique,
  signal text not null,       -- one of: 'CLEAR', 'CAUTION', 'UNVERIFIED', 'CONFIRMED', 'STALE'
  summary text not null,      -- human-readable summary generated from structured signals
  report_count int not null default 0,
  contradiction_count int not null default 0,
  last_report_at timestamptz,
  updated_at timestamptz not null default now()
);

-- report_relations: Pairwise relationship graph between reports evaluated by AI comparison.
-- Used to render evidence views and compute corroboration/contradiction counts.
create table report_relations (
  id uuid primary key default gen_random_uuid(),
  report_a_id uuid references reports(id),
  report_b_id uuid references reports(id),
  relation text not null,     -- 'corroborates' | 'contradicts' | 'unrelated'
  rationale text,             -- explanation generated during comparison
  created_at timestamptz not null default now()
);
```

### Initial Data Seeding
Initial seed configurations include baseline locations (`Oke-Odo Junction`, `Market Road`, `Ile-Ogbo Junction`) and sample report timelines with pre-calculated relations to verify and demonstrate system behavior upon deployment.

---

## 5. API Contracts (Next.js App Router)

### `POST /api/reports`
Ingests a new community report.

- **Request Body:**
  ```json
  {
    "raw_text": "Road block at Oke-Odo junction",
    "location_raw": "Oke-Odo Junction",
    "source_label": "community"
  }
  ```

- **Processing Lifecycle:**
  1. Record report in `reports` with `status = 'pending'`.
  2. Invoke structured extraction (`lib/extraction.ts`) to resolve location, classification, and metadata.
  3. Match `location_raw` to `locations` (case-insensitive); create new location record if unknown.
  4. Fetch existing reports for `location_id` within the active corroboration window (default: 3 hours).
  5. Run pairwise comparison (`lib/comparison.ts`) against active reports; persist in `report_relations`.
  6. Recompute signal via `computeSignal()` (`lib/signal.ts`) and upsert `incident_signals`.
  7. Update report status to `'processed'`. (On extraction/comparison errors, record `status = 'error'` and retain submission).

- **Response:** Created report entity and updated `incident_signals` payload.

### `GET /api/incidents`
Returns active incident signals across all monitored locations, sorted by `updated_at desc`. Powers the primary dashboard feed.

### `GET /api/incidents/[locationId]`
Returns detailed incident signal state for a specific location along with all associated reports and pairwise relations within the window. Powers the evidence inspection interface.

### `POST /api/seed`
Administrative/development endpoint to seed or reset initial locations and sample report histories. Gated in production environments.

---

## 6. AI Ingestion & Comparison Layer

LLM interactions utilize the Google Gemini API (e.g., `gemini-2.5-flash` via `@google/genai` SDK or REST API). The architecture enforces decoupled, single-responsibility calls:

### 6.1 Structured Extraction (`lib/extraction.ts`)
Converts raw unstructured text into typed incident attributes. Runs once per report.

- **Output Contract:**
  ```json
  {
    "location": "string | null",
    "incident_type": "string | null",
    "confidence": "low | medium | high",
    "event_time_reference": "string | null"
  }
  ```
- **Requirements:**
  - Robust handling of Nigerian Pidgin, vernacular expressions, and colloquialisms.
  - Zero hallucination policy: fields not present in input must return `null`.
  - Defensive response parsing with JSON extraction fallbacks.

### 6.2 Pairwise Comparison (`lib/comparison.ts`)
Analyzes two reports regarding the same location to identify semantic consistency.

- **Output Contract:**
  ```json
  {
    "relation": "corroborates | contradicts | unrelated",
    "rationale": "Clear, concise user-facing explanation"
  }
  ```
- Evaluated pairwise between new incoming reports and existing active reports.

### 6.3 Deterministic Signal Computation (`lib/signal.ts`)
Signal generation is implemented as a pure, deterministic TypeScript function:

```typescript
export interface SignalResult {
  signal: 'CLEAR' | 'CAUTION' | 'UNVERIFIED' | 'CONFIRMED' | 'STALE';
  summary: string;
  reportCount: number;
  contradictionCount: number;
  corroborationCount: number;
}

export function computeSignal(
  reports: Report[],
  relations: ReportRelation[],
  now: Date
): SignalResult {
  // Evaluates rolling time windows, corroboration counts, and contradictions.
  // Applies strict precedence: STALE > CONFIRMED > CAUTION > UNVERIFIED > CLEAR.
}
```

**Configuration Constants:**
- `CORROBORATION_WINDOW`: 3 hours
- `STALENESS_THRESHOLD`: 90 minutes from newest relevant report

---

## 7. Frontend Interface & Experience

- **Application Architecture:** Next.js App Router with React Server Components and client-side hooks.
- **Styling:** Tailwind CSS with accessible, clear status color indicators.
- **Views:**
  - `/` (Dashboard): Location status cards with current signal indicators, summaries, and quick report submission.
  - `/incident/[locationId]` (Evidence View): Detailed chronological feed of reports, relationship badges, and corroboration rationale.
- **State Updates:** Automated background polling (15–20s interval) for real-time feed updates without heavy socket infrastructure.

---

## 8. Operational Constraints & Design Decisions

- **String-Based Location Registry:** Location resolution uses normalized string indexing against known locations. Unmatched locations automatically register as new entities. Full geospatial clustering (PostGIS) is planned for future milestones.
- **Anonymous Community Submissions:** Current version supports open reporting with client-provided source labels. Production roadmaps include tiered verification and reputation metrics.
- **Strict Evidence Transparency:** The system operates as an evidence aggregator, not a prescriptive authority. System copy maintains non-prescriptive phrasing (e.g., *"No verified incident reported in the last 30 minutes"* rather than *"This route is safe"*).

---

## 9. Quality & Completion Criteria

1. **System Build & Type Safety:** Clean compilation with TypeScript and zero linting/build errors (`pnpm build`).
2. **Deterministic Logic Coverage:** Comprehensive unit tests validating signal state evaluations, window expirations, and precedence rules.
3. **End-to-End Operational Loop:** Functional pipeline from report ingestion, extraction, comparison, signal update, to dashboard rendering.
4. **Transparent Evidence Presentation:** Evidence view clearly surfaces corroboration/contradiction relationships with legible explanations.
5. **Deployment Readiness:** Production-ready configuration deployable to Vercel and Supabase with standard environment variables.
