# SafeRoute

AI-powered community incident verification and route intelligence.

[![Next.js](https://img.shields.io/badge/Next.js-14%2B-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-9.x-orange?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](LICENSE)

SafeRoute converts scattered, informal incident reports into transparent,
time-sensitive safety signals. Rather than declaring a location "safe" or
"unsafe," it shows what has been reported, how corroborated the reports
are, whether they contradict one another, and how recent the information
is — so the person reading it can judge how much to trust it.

## Table of Contents

- [Overview](#overview)
- [Core Principle](#core-principle)
- [Architecture](#architecture)
- [Signal States](#signal-states)
- [Data Model](#data-model)
- [API](#api)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Seeding Initial Data](#seeding-initial-data)
- [Project Structure](#project-structure)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [License](#license)

## Overview

A community member submits a report in natural language, including
informal English or Nigerian Pidgin:

> "Dem block road for Oke-Odo junction."

SafeRoute extracts structured information from the report (location,
incident type, confidence), compares it against other recent reports at
the same location, and computes a signal that reflects the current state
of the evidence — corroborated, contradicted, unverified, confirmed, or
stale. Every signal is paired with an evidence view explaining exactly
why the system reached that conclusion.

## Core Principle

The system never asserts a location is safe. It reports the state of the
evidence:

- Not: _"This road is safe."_
- Instead: _"No verified incident has been reported on this route in the
  last 30 minutes."_

- Not: _"There is an attack at Oke-Odo."_
- Instead: _"Three recent reports describe an incident around Oke-Odo.
  The claim has not been officially confirmed."_

This distinction is enforced in both the signal-computation logic and the
UI copy, not left to a language model's discretion at render time.

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend   │─────▶│   API Routes      │─────▶│   Supabase       │
│  Next.js/    │      │  (Next.js App     │      │  (Postgres)      │
│  React       │◀─────│   Router)         │◀─────│                  │
└─────────────┘      └──────────────────┘      └─────────────────┘
                              │
                              ▼
                      ┌──────────────────┐
                      │   LLM API         │
                      │  (extraction +    │
                      │   comparison)     │
                      └──────────────────┘
```

Report processing pipeline:

```
Raw report
    │
    ▼
Information extraction (LLM)        → structured fields
    │
    ▼
Pairwise comparison vs. recent       → corroboration / contradiction
reports at same location (LLM)         relations, per pair
    │
    ▼
Signal computation (deterministic)   → one of five signal states
    │
    ▼
Incident feed + evidence view
```

Signal computation is implemented as plain, deterministic, unit-tested
code — not an LLM call. The language model is used where judgment about
unstructured text is genuinely required (extraction, similarity,
contradiction detection); the final signal state is derived from those
outputs by fixed rules, so it is reproducible and auditable.

## Signal States

| Signal | Label      | Meaning                                                                                                  |
| ------ | ---------- | -------------------------------------------------------------------------------------------------------- |
| 🟢     | CLEAR      | No unresolved reports for this location in the active window                                             |
| 🟠     | UNVERIFIED | A single report exists with no corroboration and no contradiction                                        |
| 🟡     | CAUTION    | Reports are partially corroborated, or at least one contradicts another                                  |
| 🔴     | CONFIRMED  | Two or more independent, mutually consistent reports, no contradictions, within the corroboration window |
| ⚪     | STALE      | The most recent relevant report is older than the staleness threshold                                    |

## Data Model

Core tables (Postgres, via Supabase):

- **`locations`** — a controlled set of named locations reports resolve
  against.
- **`reports`** — one row per submitted report, including both the raw
  text and the AI-extracted structured fields.
- **`incident_signals`** — the current computed signal per location, kept
  as a cache that can always be rebuilt from `reports` and
  `report_relations`.
- **`report_relations`** — pairwise corroboration/contradiction judgments
  between reports, with a short rationale, used to render the evidence
  view.

Full schema definitions are in [`BUILDSPEC.md`](./BUILDSPEC.md).

## API

| Method | Route                         | Purpose                                                                           |
| ------ | ----------------------------- | --------------------------------------------------------------------------------- |
| `POST` | `/api/reports`                | Submit a report; runs extraction, comparison, and signal recomputation            |
| `GET`  | `/api/incidents`              | List current signals for all locations                                            |
| `GET`  | `/api/incidents/[locationId]` | Full evidence detail for one location: reports, relations, and the current signal |

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project
- A Google Gemini API key

### Installation

```bash
git clone https://github.com/leoemaxie/saferoute
cd saferoute
pnpm install
```

### Configure environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env.local
```

See [Environment Variables](#environment-variables) below for what each
value is and where to find it.

### Set up the database

Run the schema from `BUILDSPEC.md` (Section: Data Model) against your
Supabase project, either via the Supabase SQL editor or the CLI:

```bash
supabase db push
```

### Run locally

```bash
pnpm dev
```

The app runs at `http://localhost:3000`.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=             # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= # Supabase publishable key
SUPABASE_SECRET_KEY=                  # Supabase secret key — server-side only, used for writes in API routes
GEMINI_API_KEY=                       # Google Gemini API key — server-side only
```

The LLM API key is never referenced in client-side code. Extraction and
comparison calls happen exclusively inside server-side API route
handlers.

## Seeding Initial Data

A seed script populates a representative initial dataset: multiple reports
arriving in sequence around a single location, showing the signal shift
as new, sometimes contradictory information arrives.

```bash
pnpm seed
```

This is idempotent and safe to re-run to reset the initial state.

## Project Structure

```
app/
  api/
    reports/route.ts           # POST /api/reports
    incidents/route.ts         # GET /api/incidents
    incidents/[locationId]/route.ts
  (dashboard)/page.tsx          # incident feed
  incident/[locationId]/page.tsx  # evidence view
lib/
  signal.ts                     # deterministic signal computation
  extraction.ts                 # LLM extraction call
  comparison.ts                 # LLM comparison call
  supabase.ts                   # Supabase client setup
scripts/
  seed.ts
BUILDSPEC.md                    # full technical specification
```

## Known Limitations

These are deliberate scope boundaries for the current version, not
oversights:

- **Location matching is exact/normalized string matching** against a
  small controlled table, not geocoding. A misspelled or unrecognized
  location will create a new, disconnected entry rather than merging
  with an existing one.
- **No authentication.** Report submission is anonymous. The Supabase
  row-level security policy is intentionally permissive for the publishable
  key, reflecting the current scope rather than a production-ready
  access model.
- **Corroboration and staleness windows are fixed constants** (3 hours
  and 90 minutes respectively), not tuned against real-world incident
  dynamics.
- **Pairwise LLM comparison**, not an embeddings-based similarity index.
  Appropriate at current data volumes; would need revisiting at scale.

## Roadmap

Near-term directions, in rough priority order:

1. Real geocoding and geospatial clustering (PostGIS) in place of
   string-matched locations.
2. Trusted-source reputation, so repeat, verified reporters carry more
   weight in signal computation.
3. WhatsApp ingestion, so reports can be submitted from the channel
   people already use.
4. Embedding-based similarity search to replace pairwise comparison as
   report volume grows.
5. Authenticated reporting with lightweight identity verification.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
