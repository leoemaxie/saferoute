# AGENTS.md — SafeRoute

Engineering guidelines and operational instructions for coding agents and contributors
working in this repository. Read `BUILDSPEC.md` first — it serves as the specification
for product requirements, data models, API contracts, and deterministic signal-computation logic.
This file defines architecture constraints, operational boundaries, and development workflows.

## Ground Rules & Engineering Principles

1. **`BUILDSPEC.md` is Authoritative.**
   If anything here conflicts with it, `BUILDSPEC.md` takes precedence. If `BUILDSPEC.md` is
   ambiguous or silent on a design point, implement the minimal reasonable solution, document
   the rationale in your pull request / commit description, and proceed.

2. **Scope Discipline.**
   Focus strictly on core requirements specified in `BUILDSPEC.md` Section 1. Avoid premature
   abstractions or unrequested features. If an optimization or feature is outside current milestones,
   document it with a concise `// TODO:` comment or include it in the roadmap.

3. **Deterministic Signal Computation (No LLM in Evaluation Loop).**
   As specified in `BUILDSPEC.md` Section 6.3, signal computation is deterministic code, not an
   LLM prompt. Never delegate the safety signal state evaluation to an LLM; all evaluation
   belongs in `lib/signal.ts` as pure, testable TypeScript functions.

4. **Fault-Tolerant AI Pipeline (No Lost Reports).**
   Every pipeline step interacting with external LLM APIs (extraction, comparison) must handle
   network failures, timeouts, and JSON parsing errors gracefully. On error, mark the record
   `status = 'error'` and persist the raw submission. An unparsed or partially processed report
   can be reprocessed or reviewed; dropped data cannot.

5. **Strict Scope Boundaries (Location & Geocoding).**
   Location matching uses normalized string matching against a managed locations table. Do not
   introduce unprompted geocoders, GIS extensions (PostGIS), or vector embedding pipelines until
   explicitly scheduled in milestone roadmaps.

## Recommended Build Sequence

Implement components in this dependency order:

1. **Database Schema & Migrations (`BUILDSPEC.md` Section 4)**
   Set up database tables, constraints, foreign keys, and Row Level Security policies.
   Implement seed scripts for standard locations.
2. **Seed Pipeline (`scripts/seed.ts`)**
   Create an idempotent seed script to populate baseline locations, sample reports, and relations.
   Generate baseline relations through the extraction/comparison pipeline to validate real pipeline execution.
3. **Structured Extraction (`lib/extraction.ts` / Section 6.1)**
   Extract structured incident fields from natural language reports (supporting English, Nigerian
   Pidgin, and code-switched text). Ensure defensive parsing and error handling.
4. **Pairwise Comparison (`lib/comparison.ts` / Section 6.2)**
   Implement pairwise LLM corroboration/contradiction analysis between active reports for a location.
5. **Deterministic Signal Computation (`lib/signal.ts` / Section 6.3)**
   Implement pure TypeScript evaluation logic taking reports, relations, and reference timestamps.
   Verify precedence hierarchy (STALE > CONFIRMED > CAUTION > UNVERIFIED > CLEAR) with unit tests.
6. **Report Ingestion Route (`POST /api/reports`)**
   Wire extraction, pairwise comparison, and signal recomputation into the primary write route.
7. **Incident Query Routes (`GET /api/incidents`, `GET /api/incidents/[locationId]`)**
   Implement efficient read handlers for feeds and evidence inspection views.
8. **Frontend Interface (Dashboard & Evidence Views)**
   Build the Next.js App Router client against real API endpoints. Implement periodic background
   polling (15–20s) for live updates.
9. **Deployment & Verification**
   Deploy to hosting environment (Vercel), configure production environment variables, and verify
   the end-to-end ingestion and signal adjustment loop.
10. **Documentation & Operational Runbooks**
    Ensure documentation reflects setup steps, configuration, and operational boundaries.

## Multi-Agent Architecture

When dividing tasks across parallel agents, organize work by system layer:

- **Agent A — Data & AI Layer (`BUILDSPEC.md` Sections 4 & 6):**
  Owns database schemas, seed workflows, LLM extraction/comparison modules, and deterministic
  signal evaluation. Verifiable via standalone test scripts and unit test suites.
- **Agent B — API & Frontend Layer (`BUILDSPEC.md` Sections 5 & 7):**
  Owns Next.js API route handlers, dashboard interfaces, report submission flows, and evidence
  views. Can mock core AI/signal interfaces during initial UI development, then integrate real
  implementations.

**Integration Strategy:** Define TypeScript interfaces early and integrate routes with actual domain
functions continuously to prevent contract drift.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anonymous public key
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role key (server-side only, for secure writes)
GEMINI_API_KEY=                    # Google Gemini API key (server-side only)
```

> **Security Rule:** Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` to client bundles.
> All LLM prompts and privileged database writes must execute inside server-side route handlers or server actions.

## Testing & Quality Assurance

Prioritize high-impact automated and integration testing:

- **Unit Tests for Signal Logic (`lib/signal.ts`):**
  Direct test coverage for each of the five states (CLEAR, CAUTION, UNVERIFIED, CONFIRMED, STALE)
  and edge-case precedence ordering (e.g., staleness thresholds overriding older corroborations).
- **End-to-End Pipeline Verification:**
  Manually and programmatically verify the lifecycle: submission → extraction → comparison →
  deterministic signal generation → evidence view presentation.
- **UI & Route Stability:**
  Verify robust error handling for empty states, unparseable user inputs, and network failures.

## Git & Commit Hygiene

- Maintain focused, working commits with clear descriptive messages.
- Ensure each commit leaves the application in a buildable, test-passing state (`pnpm build` succeeds).
- Keep changes modular and traceable.

## Scope Management & Decision Making

When assessing new features or architectural changes, refer to `BUILDSPEC.md` Section 1 and
Section 9 (Completion Criteria). Items outside core requirements should be tracked as future
enhancements in the project roadmap.
