# Scope Doc — SBA Document Pipeline Tool

**Author:** Breea Toomey
**Project:** SBA Document Pipeline tool for NEWITY's loan operations team
**Time budget:** 3.5 hours build + 30 min demo recording (4-hour total budget)

---

## The Problem

Loan ops at NEWITY tracks SBA Document Pipelines for ~50–75 active applications in a shared spreadsheet. Each application requires up to 12 different document types. The team's biggest pain point — in their own words — is **"not knowing which applications are stalled waiting on documents. Things fall through the cracks."**

Three people use the spreadsheet day-to-day: two loan processors and one team lead. None are technical. The team lead also compiles a weekly pipeline summary for leadership, manually, every Monday.

## The North Star

Everything in V1 serves one user goal:

> **A processor or team lead opens the tool and within 5 seconds knows which applications are stalled, why, and what to do next.**

Features that serve this goal are V1. Features that don't are V2 — regardless of how often they appeared in the original requirements list.

## What I'm Building (V1)

Three features, in priority order:

### 1. Application list view — "what's stalled?"
- All 60 applications in a sortable, filterable list
- Each row shows: business name, processor, loan amount, document completeness (e.g., "8/12 received"), and a **stalled** indicator
- An application is flagged as stalled if it has any document that's `Pending` and older than 14 days, or `Under Review` and older than 7 days, or `Expired`
- Default sort: most stalled first. The thing the team cares about most is on top by default.
- Filter chips for: stalled only, by processor, by application age

### 2. Application detail view — "what's missing on this one?"
- Drill into a single application
- All 12 document slots laid out, each showing: status, date received, expiration date (if applicable), and notes
- Status is editable inline with a dropdown — no modal, no extra click. Non-technical users move faster when the edit happens in place.
- Expiration dates render with visual urgency: green (>90 days out or no expiry), yellow (30–90 days), red (<30 days or expired)
- Notes field is editable inline

### 3. Expiring soon view — "what's about to break?"
- Global view across all applications
- Lists every document that's expired or expiring in the next 30 days, sorted by urgency
- One-click jump to the affected application's detail view
- Replaces the "email alerts" the team asked for — same information, surfaced where they already are instead of in a separate inbox

## What I'm Cutting (and why)

| Requested | Why I'm not building it | What I'd do in V2 |
|---|---|---|
| **Email alerts when documents are about to expire** | Real email infra is a 2-hour rabbit hole (deliverability, scheduling, templates, suppression lists). For a 3-user team, surfacing the same info prominently in the UI delivers the same outcome in 1/10 the time. | SendGrid or Resend, daily digest at 8am, opt-out per user. |
| **Dashboard view for leadership** | Different user, different needs. Leadership wants weekly aggregates; ops wants real-time operational view. Building both in 4 hours means doing neither well. | Separate route, weekly auto-generated email digest with pipeline counts, stalled-app trends, and expiring-doc forecast. |
| **Multi-user real-time sync** | Only 3 concurrent users; concurrency risk is low. Optimistic local updates plus a "last edited by X at Y" timestamp covers the actual collaboration need. | Firestore or Supabase real-time subscriptions if usage scales. |
| **Authentication / user accounts** | Standalone tool with no required integrations; auth adds scope without V1 value. | SSO via Google Workspace, role-based permissions (processor vs. team lead). |
| **Backend persistence** | V1 lives in `localStorage`. The CSV/spreadsheet remains the source of truth; this tool is a productivity layer on top of it. That's the right product call — half-building real persistence would create confusion about where data actually lives. | Postgres-backed API; CSV becomes an import/export format, not the source of truth. |

## Tech Stack

- **Next.js 14 (App Router) + React + TypeScript** — fast scaffold, browser-first, no deploy needed.
- **Tailwind + shadcn/ui** — production-quality components without spending build time on styling primitives.
- **`papaparse`** — CSV ingest in the browser.
- **`localStorage`** — in-session persistence. Explicit V1 decision; called out in self-assessment.
- **`date-fns`** — date math for expiration thresholds and stalled-application detection.

Built in Claude Code with Claude in VS Code (extension) for side conversations and pressure-testing.

## Data Model

```ts
type DocumentStatus = "Pending" | "Received" | "Under Review" | "Approved" | "Expired" | "Not Required";

type Document = {
  id: string;
  applicationId: string;
  documentType: string;
  status: DocumentStatus;
  dateReceived: string | null;
  expirationDate: string | null;
  notes: string | null;
};

type Application = {
  id: string;          // APP-2026-1001
  businessName: string;
  borrowerName: string;
  loanAmount: number;
  applicationDate: string;
  assignedProcessor: string;
  documents: Document[];
};

type DerivedApplicationStatus = {
  completeness: number;        // 0..1
  isStalled: boolean;
  stalledReasons: string[];    // e.g. ["3 pending >14d", "1 expired doc"]
  expiringSoonCount: number;
};
```

Source data is loaded once from the CSV; mutations write to `localStorage` keyed by `applicationId`. Reads merge CSV defaults with `localStorage` overrides.

## Time Plan

| Block | Duration | Output |
|---|---|---|
| 0:00–0:30 | 30 min | Scope doc (this) + AI log skeleton — **done** |
| 0:30–1:00 | 30 min | Scaffold Next.js app, install deps, ingest CSV, render raw table |
| 1:00–1:45 | 45 min | Application list view + stalled detection logic |
| 1:45–2:30 | 45 min | Application detail view + inline editing |
| 2:30–3:00 | 30 min | Expiring soon view + visual urgency styling |
| 3:00–3:30 | 30 min | README, self-assessment doc, polish pass |
| 3:30–4:00 | 30 min | Record demo video, finalize |

If I hit 1:45 and the list view isn't done, the expiring-soon view becomes the cut, not the detail view. The detail view is what makes the tool *usable*; expiring-soon is what makes it *valuable*. Detail wins.

## Self-Assessment — pre-build draft

> **Note:** This is the planning-time self-assessment, drafted before any code was written. The final post-build self-assessment — with the actual shipped limitations — lives in `README.md` under "Self-assessment." Both are preserved so future me (or whoever inherits the code) can compare what I expected to be rough against what actually turned out to be rough — useful when evaluating where engineering intuition was accurate and where the build surprised me.

What I expect to be solid:
- Clear product framing tied to the team's stated pain point
- Clean, readable code with explicit type definitions
- Deliberate scope decisions with V2 framing

What I expect to be rough:
- `localStorage` is a real limitation — refreshing the browser in a new session loses everything; team members can't see each other's edits
- No undo / change history for status updates
- Stalled-application thresholds (14 days, 7 days) are hardcoded — should be configurable per processor or per loan size
- Single-user assumption baked into the UI; doesn't surface "Janet is currently editing this application"
- No accessibility audit; basic keyboard navigation only

What I'd ship next (if granted a V2 sprint, in priority order):
1. Real backend persistence + multi-user support
2. Weekly leadership digest (email + in-app view)
3. Configurable stalled-application thresholds
4. Audit log of status changes
5. Email/SMS alerts for high-urgency expirations

## Scope adjustments during build

The dashboard view below was originally cut from V1 in the scope doc above. It was reintroduced during the build as a documented adjustment, not as a silent scope rewrite. The original V1 list, north star, and cut rationale above remain unchanged — this section is the honest record of what was added on top of V1 and why.

A second adjustment (a data quality callout) was prototyped during build and then deliberately removed before submission. It is documented at the end of this section for transparency.

### Adjustment 1 — Leadership dashboard (`/dashboard`)

**Original disposition:** Cut from V1 with the reasoning *"separate user with separate needs (weekly cadence, aggregate view). V2 work."*

**Reintroduced as:** A snapshot dashboard view at `/dashboard` showing pipeline stat cards (active apps, pipeline value, stalled rate, expiring count), per-processor workload table sorted by stalled rate, and a top-5-most-overdue applications list.

**Why this expansion fits within scope:**
- The underlying derived-state layer built for V1 (`deriveStatus`, `selectExpiringDocs`) already computed every aggregate the dashboard needs. The view composes existing helpers; it does not introduce new business logic. Total build time: 18 minutes against a 35-minute hard ceiling.
- The original cut was about the weekly auto-generated email — a separate user with a separate cadence and separate delivery mechanism. **That piece stays cut.** What's reintroduced is the snapshot view, which is a leaner subset of the original ask.
- Engineering judgment trigger: if the dashboard had required new aggregation logic, a new data layer, or pushed any of the other deliverables (tests, docs, demo) into a corner, it would have stayed cut.

**What stays a V2 item:**
- Weekly auto-generated email digest for leadership
- Trends over time (this version is a point-in-time snapshot — no historical data captured)
- Drill-down filters, date-range controls, exports

### Considered and removed — Data quality callout

A small callout was prototyped on the list view to surface 27 documents in the dataset marked `Expired` but missing an `expiration_date` — the same finding that motivated the tightened Expired rule in stalled detection.

**Why it was removed before submission:**
- The implementation was a single hardcoded check (`status === 'Expired' && !expiration_date`) presented under a "Data quality" heading. That framing overpromised what the code actually did — a general data quality system versus a single-anomaly detector.
- The engineering insight behind it is stronger as demo narrative (it motivates the tightened stalled rule) than as a separate UI surface.
- Removing it cleans the scope story: one deliberate exception (the dashboard), not two.

The 27-docs finding remains captured in the segment 2 AI log entry and will be surfaced in the demo narrative as the rationale for tightening the stalled-detection rule. The code was cleanly reverted before submission; git history shows the iteration honestly.

---

## Final V1 + adjustments summary

| Surface | Status |
|---|---|
| Application list view with stalled detection | V1 (original) |
| Application detail view with inline editing + localStorage persistence | V1 (original) |
| Expiring-soon cross-application view | V1 (original) |
| Leadership dashboard snapshot | Scope adjustment |
| Data quality callout | Prototyped during build, removed before submission |
| Weekly auto-generated leadership email | Cut — V2 |
| Multi-user real-time sync | Cut — V2 |
| Auth / permissions | Cut — V2 |
| Backend persistence | Cut — V2 |
| Email/SMS alerts for high-urgency expirations | Cut — V2 |
| Configurable stalled-application thresholds | Cut — V2 |
| Audit log of status changes | Cut — V2 |
