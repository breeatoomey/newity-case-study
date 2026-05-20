# SBA Document Pipeline Tool

A browser-based tool that replaces a shared spreadsheet for tracking SBA Document Pipelines across active loan applications. Built for the NEWITY Product Engineer assessment.

The team's stated pain point — *"not knowing which applications are stalled waiting on documents; things fall through the cracks"* — is the north star. Every design decision in V1 traces back to this.

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Dev server takes about 1 second to boot. The sample CSV is served from `/sample_data.csv`; no backend, no setup beyond `npm install`.

```bash
npm run test       # run the test suite once (22 tests, ~700ms)
npm run test:watch # watch mode
```

---

## What's built

Four routes, all server-rendered shells with client-side data loading from `public/sample_data.csv`. `localStorage` overrides are merged on top of the CSV during load, so edits survive page refreshes within a session.

| Route | Purpose |
|---|---|
| `/` | Application list with stalled detection, filter chips, and completeness gauge |
| `/applications/[id]` | Per-application detail view with inline status and notes editing |
| `/expiring-soon` | Cross-application list of documents expired or expiring in next 30 days |
| `/dashboard` | Pipeline snapshot for the team lead (stat cards + per-processor workload + top 5 overdue) |

### The three V1 views

**Application list (`/`).** All 60 applications in a sortable, filterable table. Defaults to stalled-first, then application date descending — the team-lead's triage need is on top by default. Filter chips for "Stalled only" and per-processor. Each row shows a completeness gauge (received vs pending docs, percentage, color-tiered bar) and a stalled badge with human-readable reasons ("5 docs pending >14d · 1 expired doc").

**Application detail (`/applications/[id]`).** Drill into a single application. Inline-editable status dropdowns and notes inputs. Display-only date received (with future-date masking) and expiration date (with three-tier visual urgency). All edits persist to `localStorage` and propagate back to the list view.

**Expiring soon (`/expiring-soon`).** Cross-application triage of every document expiring in the next 30 days or already expired. Selection is driven by `expiration_date`, not status — so an Approved doc expiring in 5 days still appears here. That's the whole point.

### Scope adjustment: leadership dashboard

`/dashboard` was explicitly cut from V1 in the scope doc ("separate user with separate needs, V2 work") and reintroduced as a documented adjustment after V1 was feature-complete. The underlying derived-state layer was already doing the aggregation; the dashboard just composes existing helpers. The original cut — the *weekly auto-generated email* — stays cut as a V2 item.

See `scope-doc.md` "Scope adjustments during build" for the honest record.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui components |
| CSV parsing | papaparse |
| Date math | date-fns |
| Persistence | `localStorage` (single namespace: `newity-doc-checklist-v1`) |
| Tests | Vitest |

No backend, no auth, no deploy step. The CSV is the source of truth; `localStorage` is a productivity layer on top.

---

## Reference date

The sample data is a snapshot from early 2026. The most recent `application_date` is 2026-01-29 and the latest `date_received` is 2026-02-12. Against today's real `new Date()`, every application would be past every threshold and the stalled filter would be functionally equivalent to the "All" filter.

To preserve variation in the data, `REFERENCE_NOW` is set to `2026-01-30` (one day after the most recent application) in `src/lib/derived.ts`. In production this would be `new Date()`. The current state: **56 of 60 applications stalled, 4 on-track.**

This is a deliberate trade-off. See the demo video and `scope-doc.md` for the full reasoning.

---

## Key design decisions

A few decisions that aren't obvious from reading the code:

**Stalled detection has three triggers, with different SLAs for different doc states.** A document is *Pending* > 14 days old (waiting on the borrower), or *Under Review* > 7 days since received (waiting on the processor), or *Expired* with `expiration_date <= now`. The Pending threshold is longer because the borrower controls timing; the Under Review threshold is shorter because the processor controls it. Two different SLAs in one stalled signal.

**Under Review counts as received in the completeness gauge but trips stalled detection when aging.** Same data, two different questions, two different answers — the completeness gauge asks *"is the doc physically present?"* and the stalled flag asks *"is anything aging past its SLA?"* This is pinned by a test in `derived.test.ts`.

**Expired status alone doesn't trigger stalled detection — it requires an actual expiration date in the past.** In the sample data, 27 of 37 docs marked "Expired" have no `expiration_date` populated. Treating those as stalled would compound a data-quality issue (the source system using "Expired" as a catch-all status) into a workflow noise problem in this tool. Tightening the rule to require evidence is engineering judgment based on what the data revealed.

**Selection in the expiring-soon view is driven by `expiration_date`, not status.** An *Approved* doc expiring in 5 days still appears in this view. That's the whole point — current workflow loses sight of approved documents that expire underneath the team. Status is for display; expiration is for selection.

**The data loader merges CSV defaults with `localStorage` overrides.** This means edits made in the detail view propagate everywhere — the completeness gauge on the list view, the stalled badge, the dashboard's per-processor counts. One source of truth at the loader level; all downstream views are oblivious to whether a value came from CSV or storage.

---

## Self-assessment

### What's solid

- **Scope discipline.** Three V1 views shipped against the scope doc. One scope adjustment (the dashboard) documented as an explicit adjustment, not a silent rewrite. One feature (the "data quality" callout) prototyped during build and deliberately cut before submission because the label overpromised what the code did. The full arc is captured in `ai-log.md`.
- **Engineering judgment surfaced from the data.** The 27-of-37 finding about Expired status (data-quality refinement of the stalled rule), the Bank-Statements-only insight in the expiring-soon view (reframes what the view is for), the Janet-Morrison-is-100%-stalled signal (workload visibility the current spreadsheet can't produce) — these came out of building, not before. Each is documented in the AI log and serves the demo.
- **Test coverage on the high-value logic.** 22 tests on the pure-function rules (`deriveStatus`, `urgencyTier`, `selectExpiringDocs`), including explicit boundary pins on day-30 and day-90 thresholds with comments explaining the implementation choices. The test file reads as executable spec for the rules.
- **Clean derived-state layer.** Stalled detection, urgency tiers, and the expiring-soon selector are pure functions with no React entanglement. Same logic powers four views without duplication. The dashboard was a ~18-minute build because the data layer was already doing the work.

### What's rough

- **`localStorage` is the persistence layer.** Edits survive page refreshes but not browser changes; no multi-user sync; no concurrent-edit handling. A real V2 needs a backing store.
- **Stalled-detection thresholds are hardcoded.** 14 days for Pending, 7 days for Under Review. Real teams will want these configurable per processor, per loan size, or per doc type. They're constants right now.
- **`REFERENCE_NOW` is a constant for sample-data evaluation.** Production needs `new Date()`. This is deliberate and documented, but it's also a real artifact of working against a snapshot.
- **No accessibility audit.** Keyboard navigation works because shadcn/ui handles it, but I didn't verify screen-reader behavior, color contrast against WCAG AA, or focus management on edits.
- **No audit log of status changes.** The detail view writes through to `localStorage` on every edit; there's no "changed by X at time Y" trail. The team lead will eventually want one.
- **Demo data shows artifacts of the snapshot.** A small number of rows show "Received" status but "Not yet received" date — internally consistent but visually confusing. Surfaced in the demo narrative rather than papered over.
- **Tied tiebreaker in the dashboard.** Three applications tie at 8 stalled docs in the "top 5 most overdue" list. They sort in CSV order. A stable secondary sort (older application date first) is the obvious V2 fix.

### What I'd build next

In priority order, if I had another sprint:

1. **Backend persistence + multi-user real-time sync.** The single biggest unlock. Today's `localStorage` story is V1-only; serious adoption needs Postgres (or similar) with optimistic updates and conflict resolution. Three users are below the threshold where this matters, but it's the first thing that matters when usage grows.
2. **Configurable stalled-detection thresholds.** Per-processor, per-loan-size, per-doc-type, or some combination. The current 14/7-day defaults are reasonable starting points but every team has its own SLAs.
3. **Severity tiers, not binary stalled.** A 90-day-pending doc is qualitatively different from a 15-day-pending doc. The current UI treats them identically. Tiering would change how the list sorts, how the dashboard highlights, and which docs trigger any future alerting work.
4. **Weekly auto-generated leadership email.** The piece of the original ask that stayed cut from V1 even after the dashboard expansion. Same data, different cadence and delivery mechanism.
5. **Audit log of status changes.** Persisted change history per document. Cheap to build on top of a real backend; impossible to add cleanly to `localStorage`.
6. **Loader integration test.** See QA plan below — this is the highest-blast-radius testing gap right now.

---

## QA plan

### What's covered today

22 unit tests in `src/lib/derived.test.ts`, all passing on first run:

- `deriveStatus` (12 tests): happy path, three stalled triggers, two data-quality edge cases (Expired with and without an expiration date), completeness math, the Under-Review-as-received design call, and reason-string formatting.
- `urgencyTier` (7 tests): null handling, exact boundary pins at days 30 and 90, negative-days (already expired), and far-future cases.
- `selectExpiringDocs` (3 tests): cross-app sort by expiration ascending, exclusion of docs without `expiration_date`, respect for the `daysAhead` cutoff.

Run with `npm run test`. Watch mode is `npm run test:watch`.

### What's deliberately not covered

Each of these is excluded with a one-line comment in the test file explaining why:

- **React components and pages.** Component tests on shadcn/Tailwind UIs are brittle and slow, and the bugs they catch are mostly cosmetic. The pure-function tests catch the bugs that actually matter.
- **CSV parsing.** Trust `papaparse`.
- **Date math.** Trust `date-fns`.
- **`localStorage` browser integration.** That's E2E territory, not unit. Manual sanity-check pass before commit.

### What I'd test next (highest-blast-radius gap)

A round-trip integration test on the data loader (`src/lib/data.ts`). The loader is the single boundary between external data and the derived layer. Every existing test in `derived.test.ts` validates behavior *given* well-formed `Application[]`. If the loader silently mis-parses a column or drops a doc, every derived calculation downstream is wrong and no current test catches it.

A single ~30-line loader test would feed a small in-memory CSV string plus a mocked `getOverrides()` return value through `loadApplications()` and assert:

- `loanAmount` becomes a number, not a string
- Empty string fields become null
- Override `status` wins over CSV status when both exist
- Override `notes: null` (explicit clear) wins over CSV non-null notes (the `"notes" in override` distinction is subtle and easy to break)
- Doc ID format is `${appId}-${documentType}`

This is the highest-leverage next test because the loader is where the most consequential silent breakage can happen.

### What I'd do for shipping QA

Before shipping to the loan-ops team, the testing plan beyond the unit suite:

- **Manual end-to-end pass on the three V1 user flows** with a real loan officer at a screen-share: list → drill into stalled app → edit a status → confirm completeness updates on return → use the expiring-soon view to find an aging doc → fix it from detail view. Goal is to catch UX friction the unit tests can't surface.
- **Localstorage edge cases**: private browsing (storage unavailable), localStorage quota exceeded, concurrent tab edits. Most of these are caught by the try/catch in `src/lib/storage.ts`, but they need verification on real browsers.
- **CSV ingestion against real production data** (or a redacted slice of it). The sample data is clean — real production data has more anomalies. Loader behavior under malformed rows, missing columns, and unexpected values needs to be characterized.
- **Performance pass at scale.** The current implementation renders the full table in one pass. At 50-75 active applications the team mentioned, this is fine. Beyond a few hundred, virtualized rendering becomes worth considering. Not a current concern.

---

## Repository structure

```
.
├── README.md                          ← this file
├── scope-doc.md                       ← original scope + adjustments
├── ai-log.md                          ← AI usage across all phases
├── ai-evidence/
│   └── build-session.jsonl            ← Claude Code session transcript
├── data/
│   └── sample_data_a_document_checklist.csv
├── public/
│   └── sample_data.csv                ← served to the browser
└── src/
    ├── app/
    │   ├── page.tsx                   ← application list view (/)
    │   ├── applications/[id]/page.tsx ← detail view
    │   ├── expiring-soon/page.tsx     ← cross-app expiration triage
    │   └── dashboard/page.tsx         ← pipeline snapshot (scope adjustment)
    ├── lib/
    │   ├── types.ts                   ← TypeScript data model
    │   ├── data.ts                    ← CSV loader + localStorage merge
    │   ├── storage.ts                 ← localStorage wrapper
    │   ├── derived.ts                 ← stalled rules, urgency tiers, selectors
    │   └── derived.test.ts            ← 22-test vitest suite
    └── components/ui/                 ← shadcn/ui components
```

---

## Deliverables

Three deliverables for the assessment:

1. **This code repository** — `git clone`, `npm install`, `npm run dev`.
2. **Demo video** — 5-10 minute screen recording covering what the tool does, the scope decisions made, the testing approach, an honest self-assessment, and what would come next.
3. **AI usage log** — see `ai-log.md`. Documents AI usage across Understanding, Scoping & Planning, Building, Testing, and Documentation phases. Raw Claude Code session transcript in `ai-evidence/build-session.jsonl`.

---

*Built for NEWITY's Product Engineer assessment. ~4 hours total against a 4-hour cap.*