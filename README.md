# SafeRoute

> AI-assisted community incident verification and deterministic route intelligence.

[![Next.js](https://img.shields.io/badge/Next.js-15%2B-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)](LICENSE)

SafeRoute transforms unstructured, informal community incident reports—including multilingual text, local slang, and Nigerian Pidgin—into verified, time-sensitive safety intelligence.

Rather than making binary safety assertions (*"safe"* vs. *"unsafe"*), SafeRoute surfaces verified evidence: corroboration levels, emerging contradictions, and temporal freshness, enabling travelers and responders to make well-informed decisions.

---

## Key Highlights

- **Nuanced Natural Language Extraction:** Ingests unformatted, colloquial reports and extracts structured entities (location, incident classification, temporal anchors, confidence scores).
- **Pairwise Report Comparison:** Compares incoming claims against active local reports to surface mutual corroboration or conflicting accounts.
- **Deterministic Signal Evaluation:** Safety signals are computed strictly through pure, auditable TypeScript rule sets—never delegated to an LLM runtime.
- **Transparent Evidence View:** Every computed state is accompanied by a transparent audit trail showing underlying reports, timestamps, and pairwise reasoning.

---

## Signal Evaluation Matrix

Safety states follow an explicit, deterministic evaluation hierarchy. A location's signal reflects the state of available evidence rather than an unverified guarantee.

| Signal | State | Description |
| :--- | :--- | :--- |
| 🟢 | **CLEAR** | No active or unresolved incident reports within the operational time window. |
| 🟠 | **UNVERIFIED** | An isolated incident report has been submitted without corroborating or conflicting evidence. |
| 🟡 | **CAUTION** | Multiple reports exist with partial corroboration, conflicting details, or active dispute. |
| 🔴 | **CONFIRMED** | Two or more independent, corroborating reports agree with zero unresolved contradictions. |
| ⚪ | **STALE** | Active reports have exceeded the recency threshold (default: 90 minutes) without fresh confirmation. |

*Precedence Hierarchy:* `STALE` > `CONFIRMED` > `CAUTION` > `UNVERIFIED` > `CLEAR`.

---

## System Architecture

```
┌─────────────────────────────────┐
│     Next.js Client (React)      │
│  Incident Dashboard & Evidence  │
└────────────────┬────────────────┘
                 │ HTTP / REST
                 ▼
┌─────────────────────────────────┐       ┌────────────────────────┐
│     Next.js App Router API      │──────▶│   LLM Service API      │
│  - Ingestion & Validation       │       │  - Entity Extraction   │
│  - Pairwise Comparison Flow     │◀──────│  - Pairwise Comparison │
│  - Deterministic Evaluation     │       └────────────────────────┘
└────────────────┬────────────────┘
                 │ Read / Write
                 ▼
┌─────────────────────────────────┐
│     Supabase / PostgreSQL       │
│  locations, reports, relations, │
│  and computed incident signals  │
└─────────────────────────────────┘
```

---

## Quickstart

Follow these steps to set up and run the SafeRoute application locally.

### Prerequisites

- **Node.js:** v20.x or higher
- **pnpm:** v9.x or higher
- **Supabase Account:** Managed project or local instance
- **Gemini API Key:** For server-side entity extraction and report comparison

### 1. Clone the Repository

```bash
git clone https://github.com/leoemaxie/saferoute.git
cd saferoute
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env.local` file from the example template:

```bash
cp .env.example .env.local
```

Populate the required credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SECRET_KEY=your-supabase-service-role-key

# LLM API
GEMINI_API_KEY=your-gemini-api-key
```

> **Security Note:** `SUPABASE_SECRET_KEY` and `GEMINI_API_KEY` are used exclusively in server-side route handlers and are never exposed to client bundles.

### 4. Apply Database Migrations

Apply the database schema to your Supabase project:

```bash
supabase db push
```

Alternatively, execute the migration scripts located in `supabase/migrations/` using the Supabase SQL Editor.

### 5. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/reports` | `POST` | Ingests a raw report, executes entity extraction, runs pairwise comparisons, and updates the location's signal state. |
| `/api/incidents` | `GET` | Fetches the current computed safety signals across all registered locations. |
| `/api/incidents/[locationId]` | `GET` | Retrieves detailed incident evidence for a location, including source reports, pairwise relations, and computation rationale. |

---

## Development & Testing

```bash
# Run lint checks
pnpm lint

# Format code with Prettier
pnpm format

# Build for production
pnpm build
```

---

## Design Principles & Limitations

- **Evidence Over Assertion:** The platform does not declare roads safe; it accurately describes the recency and corroboration level of incoming data.
- **Normalized Location Resolution:** In the current phase, locations are resolved against a managed dictionary using normalized string matching rather than complex geospatial indexing (PostGIS).
- **Separation of LLM and Decision Logic:** Language models parse messy user prose and detect semantic contradictions; business logic and safety states are determined entirely by deterministic rules.

---

## Contributing

Contributions are welcome! Please ensure that any PR maintains the strict separation between LLM extraction and deterministic signal evaluation. Code changes should pass `pnpm lint` and `pnpm build` prior to submission.

---

## License

This project is open-source software licensed under the [Apache License 2.0](LICENSE).
