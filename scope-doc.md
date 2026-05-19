# Scope Doc — SBA Document Checklist Tool
 
**Author:** Breea Toomey
**Assessment:** NEWITY Product Engineer take-home
**Time budget:** 3.5 hours build + 30 min demo recording (4-hour hard cap)
 
---
 
## The Problem
 
Loan ops at NEWITY tracks SBA document checklists for ~50–75 active applications in a shared spreadsheet. Each application requires up to 12 different document types. The team's biggest pain point — in their own words — is **"not knowing which applications are stalled waiting on documents. Things fall through the cracks."**
 
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
| **Authentication / user accounts** | Brief explicitly says no integrations and standalone. Adding auth would consume scope for no V1 value. | SSO via Google Workspace, role-based permissions (processor vs. team lead). |
| **Backend persistence** | V1 lives in `localStorage`. The CSV/spreadsheet remains the source of truth; this tool is a productivity layer on top of it. This framing is *more* defensible than half-building real persistence. | Postgres-backed API; CSV becomes an import/export format, not the source of truth. |
 
## Tech Stack
 
- **Next.js 14 (App Router) + React + TypeScript** — fast scaffold, browser-first, no deploy needed for the brief.
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
| 3:30–4:00 | 30 min | Record demo video, submit |
 
If I hit 1:45 and the list view isn't done, the expiring-soon view becomes the cut, not the detail view. The detail view is what makes the tool *usable*; expiring-soon is what makes it *valuable*. Detail wins.
 
## Self-Assessment (drafted now, refined after build)
 
What I expect to be solid:
- Clear product framing tied to the team's stated pain point
- Clean, readable code with explicit type definitions
- Defensible scope decisions with V2 framing
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

The two items below were originally cut from V1 in the scope doc above. They were reintroduced during the build as documented adjustments, not as silent scope rewrites. The original V1 list, north star, and cut rationale above remain unchanged — this section is the honest record of what was added on top of V1 and why.

### Adjustment 1 — Leadership dashboard (`/dashboard`)

**Original disposition:** Cut from V1 with the reasoning *"separate user with separate needs (weekly cadence, aggregate view). V2 work."*

**Reintroduced as:** A snapshot dashboard view at `/dashboard` showing pipeline stat cards (active apps, pipeline value, stalled rate, expiring count), per-processor workload table sorted by stalled rate, and a top-5-most-overdue applications list.

**Why this expansion is defensible:**
- The underlying derived-state layer built for V1 (`deriveStatus`, `selectExpiringDocs`) already computed every aggregate the dashboard needs. The view composes existing helpers; it does not introduce new business logic. Total build time: 18 minutes against a 35-minute hard ceiling.
- The original cut was about the weekly auto-generated email — a separate user with a separate cadence and separate delivery mechanism. **That piece stays cut.** What's reintroduced is the snapshot view, which is a leaner subset of the original ask.
- Engineering judgment trigger: if the dashboard had required new aggregation logic, a new data layer, or pushed any of the other deliverables (tests, docs, demo) into a corner, it would have stayed cut.

**What stays a V2 item:**
- Weekly auto-generated email digest for leadership
- Trends over time (this version is a point-in-time snapshot — no historical data captured)
- Drill-down filters, date-range controls, exports

### Adjustment 2 — Data quality callout

**Original disposition:** Not explicitly listed in V1 or as a cut. Surfaced during build as a *finding*, not a feature.

**Reintroduced as:** A small informational callout on the list view header that displays the count of documents marked `Expired` in the data but missing an `expiration_date`. Surfaces the engineering decision made in segment 2 (the tightened Expired rule requiring evidence of expiration) into the UI, where the affected docs can be reviewed.

**Why this expansion is defensible:**
- It is not new logic. The selection rule is the inverse of the predicate already used in stalled detection. The callout reads existing state; it does not introduce new state, new rules, or new persistence.
- It addresses a real data-quality observation found during build (27 of 37 Expired-status docs have no expiration_date), turning an engineering judgment into product-visible insight.
- This aligns with one of the responsibilities in the role description: *"implement data collection, analysis, and reporting features to support business intelligence."*

**What stays out of scope:**
- Filtering, dismissal, or "I've reviewed this" tracking on the affected docs
- Per-app or per-processor breakdowns of data quality issues
- Automated alerting / escalation on data quality

---

## Final V1 + adjustments summary

| Surface | Status |
|---|---|
| Application list view with stalled detection | V1 (original) |
| Application detail view with inline editing + localStorage persistence | V1 (original) |
| Expiring-soon cross-application view | V1 (original) |
| Leadership dashboard snapshot | Scope adjustment 1 |
| Data quality callout | Scope adjustment 2 |
| Weekly auto-generated leadership email | Cut — V2 |
| Multi-user real-time sync | Cut — V2 |
| Auth / permissions | Cut — V2 |
| Backend persistence | Cut — V2 |
| Email/SMS alerts for high-urgency expirations | Cut — V2 |
| Configurable stalled-application thresholds | Cut — V2 |
| Audit log of status changes | Cut — V2 |