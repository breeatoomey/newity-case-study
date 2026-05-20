# AI Usage Log — NEWITY Product Engineer Assessment

Primary tools: Claude Code (build), Claude in VS Code via extension (side conversations, doc work, pressure-testing decisions).

This log captures intentional AI usage across each phase of the assessment — Understanding, Scoping & Planning, Building, Testing, and Documentation. Each entry includes the prompt I gave, the substance of the AI response, and the decisions I made (including where I overrode AI recommendations).

---

## Phase 1: Understanding

**Date:** 05/17/2026
**Tool:** Claude (web)
**Goal:** Before writing any code, develop a clear understanding of the team's workflow problem, identify the highest-leverage features for solving it, and explore the shape of the sample data.

### Prompt

> I'm building a browser-based tool to replace a shared spreadsheet that the loan operations team uses to track SBA document checklists. I've attached the brief and the sample CSV (~620 rows, 60 applications × 12 document types). Build time available is roughly 3–4 hours.
>
> Before I write a single line of code, I want to think through the problem itself. Specifically:
>
> 1. What's the actual workflow pain this team is experiencing? What's the underlying problem behind the surface feature requests?
> 2. The brief lists 5 requested features. Which would deliver the most value to a 3-person ops team, and which are nice-to-haves vs. essentials?
> 3. What does the sample data actually look like? What's the shape of the problem before I model it?
> 4. What's a realistic time plan that leaves room for both building and clearly communicating what was built?
>
> Push back if my framing is off. I'd rather get an honest read now than discover gaps mid-build.

### Key insights from the AI response

**The team's stated pain point is the north star.** Buried in the requirements Q&A: *"Not knowing which applications are stalled waiting on documents. Things fall through the cracks."* This reframes the product from "spreadsheet replacement" to "stalled application detector." Every feature decision should trace back to this pain — including the decision to *not* build features that don't directly attack it, even if they were explicitly requested.

**Three features deliver the most value to a 3-person ops team:**

1. **Application list view** with completeness and stalled-status indicators — the surface where processors see "what needs attention right now."
2. **Application detail view** — drill into all 12 doc types per application, update statuses inline, expiration dates rendered with visual urgency (red / amber / green by days until expiry).
3. **Global expired / expiring-soon view** — a triage surface that catches docs the team approved and then forgot about. The team's expiration concern fused with the outstanding-items filter into a single workflow.

**Lower-leverage requests, and why each is V2 work:**

- **Email alerts** — for a 3-user team, real email infra is high-cost: deliverability, templating, scheduling, suppression lists. Surfacing the same information prominently in the UI delivers the same outcome with much less complexity.
- **Leadership dashboard / weekly summary auto-generation** — different user with different needs (weekly cadence, aggregate view). Trying to serve both the operational user and the leadership user in V1 means doing neither well.
- **Multi-user real-time sync** — only 3 concurrent users. Optimistic local updates handle the actual collaboration need without the architectural cost of real-time infrastructure.
- **Authentication / permissions** — explicit non-goal per the brief.
- **Persistence beyond `localStorage`** — for V1, the spreadsheet remains the source of truth and this tool is a productivity layer on top of it. That framing is *more* defensible than a half-built real persistence layer.

**Data shape (verified by AI inspecting the CSV):**

- 620 rows, 60 applications, 12 doc types, 3 processors (Aisha Patel, Janet Morrison, Ricardo Fuentes), 6 statuses (Pending, Received, Under Review, Approved, Expired, Not Required).
- ~78% of rows have no `expiration_date` — correct, since most doc types don't expire. Bank Statements (90-day) and Tax Returns (3-year) are the only expiry-relevant doc types.
- ~34% of rows have notes.
- Data is clean — no nulls in required fields, no obvious junk rows.

**Time plan:**

| Block | Duration | Activity |
|---|---|---|
| 0:00–0:30 | 30 min | One-page scope doc + AI log skeleton |
| 0:30–1:00 | 30 min | Scaffold project, define data model |
| 1:00–2:45 | 1h 45m | Build the three core features |
| 2:45–3:15 | 30 min | README and self-assessment writeup |
| 3:15–3:45 | 30 min | Record demo video |
| 3:45–4:00 | 15 min | Buffer / final review / submit |

### My decisions

- **Scope:** Building the three core features. The other requested items get clear V2 framing in the demo, tied back to the team's stated pain point.
- **Stack:** Next.js + React + Tailwind + shadcn/ui, built in Claude Code with Claude in VS Code for side conversations. `papaparse` for CSV ingest. `localStorage` for in-session persistence. No backend.
- **North-star feature:** The stalled-application surfacing. Every other feature flows from this.
- **Demo framing:** Stakeholder presentation, not code review. Lead with the team's pain point in their own words, then trace each built feature back to it. Cuts get their own segment with reasoning.
- **Self-assessment angle:** Be explicit about what's fragile — `localStorage` means no real persistence, no concurrent-edit handling, single-user assumption baked in. Naming these limitations honestly is more useful to the team than smoothing them over.

### Pressure-testing the AI's recommendations

Places I challenged the AI's framing and either accepted, modified, or overrode:

- **Considered adding Firebase for persistence** (familiar from prior work). AI pushback: setup eats ~45 min for marginal V1 value, and "the spreadsheet remains the source of truth" is a more defensible product story than a half-built real persistence layer. **Accepted.**
- **Considered building the leadership dashboard as a 'free' feature** given that the data shape would make aggregation easy. AI pushback: it serves a different user with different needs (weekly cadence, aggregate view), and trying to address two distinct users in V1 dilutes the operational focus. **Accepted.**
- **Considered writing automated tests upfront.** Decision at this stage: prioritize getting V1 features in front of users over investing test coverage before the rules were even settled. Spending build time on tests upfront wasn't the right trade for V1. **My call — overrode the AI's leaning toward writing a minimal test suite.**
- **Considered modal vs. inline editing for status changes.** AI suggested modal; I picked inline because the non-technical users moving from a spreadsheet expect in-place edits, and removing a click reduces friction for the team. **My call.**

---

## Phase 2: Scoping & Planning

**Date:** 05/17/2026
**Tool:** Claude (web)
**Output:** `scope-doc.md` (one-page scope document)
**Goal:** Translate the Phase 1 analysis into a concrete one-page scope doc that drives the rest of the build.

### Prompt

> Based on the Phase 1 analysis we just did, co-draft a one-page scope doc with me. Structure I want: the problem statement (in the team's own words where possible), a single north-star user goal, the V1 feature list in priority order, an explicit cut-list with V2 framing for each cut, tech stack with one-line reasoning per choice, the data model in TypeScript, a time plan with a fallback if I run over, and a draft self-assessment I can refine after building. Be specific, no vague language. If a feature is in V1, define exactly what it does in 2-3 bullets. If it's cut, give me the actual reason and what V2 would look like.

### Co-drafting process

Claude produced a first draft based on the Phase 1 decisions already on the table — the three core features, the cut list, the tech stack, the time budget. I worked through the draft section by section. The places where I changed or refined what came back:

- **Stalled-application thresholds.** Draft suggested 7 days for `Pending`. I changed to 14 days for `Pending` and kept 7 days for `Under Review`. Reasoning: a doc that's been *requested* but not yet received takes longer in normal operations (waiting on the borrower); a doc that's been received and is under review should move faster (waiting on the processor). Two different SLAs.
- **Inline vs. modal editing.** Draft offered both as options. Committed to inline-only — fewer clicks, closer to the spreadsheet mental model the team already has.
- **Cut justification for the leadership dashboard.** Draft's reasoning was "different user, different needs." I sharpened to "different cadence" — leadership wants weekly aggregates, ops wants real-time operational view. Building both in 4 hours means doing neither well.
- **Time-plan fallback.** Added the explicit rule for what gets cut if I'm behind at the 1:45 mark: expiring-soon view, not the detail view. Detail makes the tool *usable*; expiring-soon makes it *valuable*. Usable wins under time pressure.
- **Self-assessment "rough" list.** Added the threshold-hardcoding and the single-user-assumption items myself. The honest fragility list is the section that matters most for the demo — wanted to make sure it reflected my actual technical concerns, not generic ones.

### Decisions locked in

- V1 scope is final. Cut list is final. No new features get added mid-build without an explicit corresponding cut.
- Stack is committed: Next.js + TypeScript + Tailwind + shadcn/ui + papaparse + localStorage + date-fns.
- Data model is in the scope doc; will be the source of truth for the build.
- Time plan has a documented fallback at the 1:45 checkpoint.

### What I'm using the scope doc for

Three jobs, in order:
1. **Anchor for the build** — when I'm tempted to add something mid-build, I check the doc first.
2. **Source material for the README** — the "what's built," "what's cut," and "what's next" sections lift straight in.
3. **Demo script backbone** — the demo follows the same arc as this doc: problem → north star → built features → cuts → V2.

---

## Phase 3: Building

### Build segment 1: Scaffold + raw table render

**Tool:** Claude Code
**Duration:** ~30 minutes
**Raw transcript:** Single Claude Code session covering all build segments; exported at end of build to ai-evidence/build-session.jsonl

#### Prompt strategy

Used a structured prompt that:
- Forced the agent to read `scope-doc.md` *before* acting (single biggest quality lever — without it, Claude Code produces plausible-but-off scaffolds)
- Locked the stack explicitly so the agent wouldn't second-guess choices already made in Phase 2
- Drew the scope line hard: scaffold + render only, no business logic
- Gave permission to make trivial calls without asking ("decide and flag, don't ask me where to put the public CSV")
- Required a structured handoff at the end (what works, what's decided, what surprised the agent, what to verify) — this is what makes the session loggable

#### What the agent produced

- `create-next-app` with TS, Tailwind, App Router, src dir, `@/*` alias
- shadcn/ui initialized with `table`, `badge`, `input`, `select`, `button` components
- `src/lib/types.ts` matching the scope doc data model exactly
- `src/lib/data.ts` — papaparse-based CSV loader that fetches from `/sample_data.csv`, groups flat rows by `application_id` into `Application[]`
- `src/app/page.tsx` — client component, table of all 60 applications, columns for business, borrower, processor, loan amount, application date, and a "X received / Y pending" doc count cell
- Zero TypeScript errors, dev server serving the table

#### Decisions the agent made (and surfaced)

- **CSV in `public/` rather than read at build time via `fs`.** Reasoning: page is a client component (required so localStorage overrides can layer in next session), and a server-side read would force a server component, creating friction later. Tradeoff acknowledged: raw CSV is publicly served — fine for localhost, not a production pattern. **Accepted — defensible V1 call.**
- **Doc-count formula:** `Received | Approved | Under Review` count as received; `Pending | Expired | Not Required` count as pending. **Need to verify this matches how the ops team thinks.** Will validate in segment 2 (stalled detection logic).

#### What surprised the agent (and me, reviewing)

- **Five applications have 8 documents, not 12.** The scope doc's "60 applications × 12 doc types" framing isn't quite accurate — the loader handles it gracefully, but the stalled-detection logic in the next session needs to operate on whatever's in `documents`, not assume a fixed count.
- **`create-next-app` installed Next.js 16, not 14.** App Router API unchanged so nothing breaks; Turbopack is now the default. Benign. Scope doc says "Next.js 14" — leaving the doc as-is since the version isn't load-bearing.
- **Tailwind v4 + shadcn v4** use CSS-based config (no `tailwind.config.js`). Worth knowing if I look up older docs and something looks different.

#### My critical engagement

- Reviewed the generated `data.ts` before continuing — the grouping logic correctly handles the partial-doc applications. Would have caught it in the next session anyway when stalled detection ran into edge cases, but the agent flagging it proactively saved a debug cycle.
- Eyeballed the rendered table in browser to verify it's not just a passing HTTP response. A 200 from `curl` is not the same as a working render.
- Deferred the doc-count-formula validation to the next session, where I'll be writing the stalled-detection rules anyway and the categorization needs to be locked in coherently across both features.

#### What I'm doing before the next segment

1. Browser-verify the table renders 60 rows correctly
2. Export Claude Code session log to `ai-evidence/`
3. Commit the scaffold
4. Take a short break before the highest-leverage build segment

### Build segment 2: List view with stalled detection

**Tool:** Claude Code
**Duration:** ~50 minutes (build + debug + fix)
**Raw transcript:** Same Claude Code session as segment 1; exported at end of build to `ai-evidence/build-session.jsonl`

#### Prompt strategy

This was the highest-leverage feature of the build — the north-star view from the scope doc. Three things baked into the prompt that paid off:

- **Locked the categorization rules exhaustively.** "Under Review counts as received for the completeness gauge, but trips stalled-detection when aging. Same data, two different questions, two different answers — explain this in code comments." Without this lock, the agent would have made a reasonable but different call, and I'd have spent rework time on it.
- **Built in a trip-wire for sanity-checking.** "Tell me the stalled count out of 60 — gut-check whether it feels right. If it's 55/60, something is too aggressive; if it's 2/60, something is too lenient." This forced the agent to validate the output against an external standard, not just confirm the code compiles.
- **Specified the default sort order explicitly** ("stalled first, then by application_date descending"). Defaults are product decisions disguised as engineering ones — leaving them implicit means the agent picks whatever Tailwind table examples it saw most.

#### What the agent produced (first pass)

- `DerivedApplicationStatus` type added to `types.ts`
- `src/lib/derived.ts` — computes completeness, stalled status, and human-readable reasons per application
- `src/app/page.tsx` refactored into a real list view: header with stalled count, filter chips ([All]/[Stalled only] and per-processor), completeness column with progress bar + percentage + color tiers, stalled badge with reasons
- Zero TypeScript errors, dev server serving the list view

#### The 60/60 problem and how it got solved

The trip-wire fired. Initial stalled count: **60 of 60** — the Stalled filter was equivalent to the All filter. Three things made this a useful debug moment, not a derailment:

1. **The agent surfaced it proactively** rather than letting me discover it in the browser. The sanity-check script ran before the report. This is what good prompting buys you.
2. **The agent did exploratory data analysis without being asked.** It computed the stalled count at multiple anchor dates, ran a separate script to investigate the Expired-doc semantics, and surfaced that 27 of 37 Expired docs in the data have no `expiration_date` populated. That data oddity turned out to be the key insight.
3. **The agent presented four options with tradeoffs** instead of unilaterally picking one. Three were defensible; one (gaming the anchor to a date earlier than the most recent application) wasn't, and the agent flagged it as incoherent.

The root cause: the sample data is a snapshot from early 2026. Against today's real date (May 2026), every application is past the 14-day Pending threshold. The locked rules + the data + the real clock compound into a 100% stalled rate.

#### My critical engagement on the fix

Three decisions I made that weren't in the original spec:

- **Adopted the Expired-date sanity check** (require `expiration_date <= now` for Expired status to count). My read: this isn't a threshold change, it's a data-quality refinement of an implicit assumption. The original rule said "any Expired doc is stalled," which implicitly assumed Expired status reflected a real expiration event. The data shows that assumption doesn't hold. Tightening to require the actual evidence is engineering judgment based on what the data revealed, which is exactly what the brief asks for.
- **Set `REFERENCE_NOW = 2026-01-30`.** Earliest coherent anchor (one day after the most recent application_date), which maximizes variation in the stalled signal without making "now" precede applications that have already been filed. Documented in code with a comment explaining why this exists and that production would use `new Date()`.
- **Walked back my own target range.** The original "20-45 stalled out of 60" target I set was based on incomplete data analysis. Once the floor became visible (~26 from Expired alone, ~52 from Pending), I reframed expectations honestly rather than gaming the rules to hit a vanity number. Final count: 56/60 stalled, 4 on-track.

#### Why the final state is the right state

56/60 stalled isn't a clean demo number, but it's the honest one. The four on-track apps are all recent (4–11 days from anchor), which is exactly when the rules should *not* fire — the borrower hasn't had time to send things in yet. The rule is doing what it's supposed to.

This is also a stronger demo narrative than a manufactured 30/60 would have been: *"This is the team's pain point in numerical form — almost every active application has something requiring attention. The 4 on-track apps are the ones a processor doesn't need to worry about today. V2 turns this binary 'stalled' flag into a severity tier so a 90-day-pending doc isn't visually equivalent to a 15-day-pending one."*

#### What surprised me about the data (worth telling the team)

- **Most Expired docs aren't really expired.** 27 of 37 Expired-status docs have no expiration date. Either someone hand-flagged them for non-expiration reasons (revoked, superseded, invalid?) or the data is noisy. Either way, the team should know — the Expired status is being used as a catch-all in their current spreadsheet workflow. V2 could split this into proper sub-statuses.
- **Five applications have only 8 docs, not 12.** Confirmed in segment 1; the completeness gauge handles it correctly (denominator from actual doc count, not hardcoded 12), but the data tells me the "12 required documents" framing isn't universally applied yet.
- **Three on-track apps belong to Ricardo Fuentes; one to Aisha; zero to Janet.** Janet's caseload is 18/18 stalled — entirely. Worth surfacing if I had a real conversation with the team: is this a workload imbalance, a process difference, or noise in the sample?

#### Future-date artifact (flagged for next segment)

The 2026-01-30 anchor means some `date_received` values in the data are after "now." Not visible in the list view (no `date_received` column), but the detail view will show this. Mitigated in the segment 3 prompt: any `date_received > REFERENCE_NOW` will render as "Not yet received" in the detail view UI. Underlying data untouched.

#### What I'm doing before the next segment

1. Browser-verified the list view renders correctly with 56 stalled, 4 on-track
2. Committed the segment with message "Build segment 2: list view with stalled detection (56/60 stalled at 2026-01-30 anchor)"
3. Declined to add an "On-track only" filter mid-build despite the apparent symmetry with "Stalled only" — the team's pain point is finding stalled apps, not healthy ones, and the on-track apps are already accessible at the bottom of the default sort. Documenting this as an explicit cut, not an oversight.

### Build segment 3: Detail view with inline editing + localStorage persistence

**Tool:** Claude Code
**Duration:** ~50 minutes
**Raw transcript:** Same Claude Code session as segments 1 and 2; exported at end of build to `ai-evidence/build-session.jsonl`

#### Prompt strategy

This segment had more moving pieces than the previous two — a new route, a new persistence layer, an update to the existing data loader, and navigation wiring — so the prompt was correspondingly more structured. Three things baked in that paid off:

- **Specified the localStorage layer as its own module** (`src/lib/storage.ts`) rather than letting the agent inline it into the page. Isolating it makes it testable, swappable with a real backend in V2, and keeps the rest of the app oblivious to storage details.
- **Pre-empted the future-date artifact.** The 2026-01-30 reference date means some `date_received` values in the data are after "now" — not visible in the list view but problematic in the detail view. Specified "render as 'Not yet received' if date_received > REFERENCE_NOW" directly in the prompt so it didn't get missed.
- **Required an integration spot-check.** Asked the agent to simulate a status edit on an on-track app and report what happens to completeness and stalled status. This is what proves the override merge propagates correctly through the data layer to the derived state — far more useful than verifying that types compile.

#### What the agent produced

- `src/lib/storage.ts` — localStorage wrapper with try/catch fallback for private-browsing/unavailable cases. Synchronous API with `getOverrides()`, `setDocOverride()`, `clearOverrides()`.
- `src/lib/data.ts` updated — CSV defaults merged with localStorage overrides during load. Single namespace key (`newity-doc-checklist-v1`) holds a flat `{ [docId]: { status?, notes? } }` map.
- `src/app/applications/[id]/page.tsx` — full detail view with header (business name, metadata row, stalled badge with reasons, completeness stat), table of all docs, inline status dropdowns, inline notes inputs, expiration dates with three-tier visual urgency.
- List-view row click wired to `router.push('/applications/${app.id}')`.
- 404-style empty state if the URL ID doesn't match an application.

Type-checked clean. All three routes (`/`, `/applications/[id]`, missing-ID fallback) return 200.

#### Decisions the agent made (and surfaced)

- **Breaking doc-ID change.** Old loader generated unstable IDs based on global row index (`${appId}-doc-${idx}`). New format is `${appId}-${documentType}`, which is stable across CSV reorderings. Agent flagged it as a breaking change but correctly noted there's no existing localStorage data to migrate since this is the first segment to write any. **Accepted — this is the right key shape for the persistence layer.**
- **Notes whitespace handling.** `notes.trim() || null` on save. Whitespace-only input clears the note rather than persisting visually-empty content. Avoids the "did my note save?" UX confusion.
- **Override notes shape: `string | null`.** Null is explicit "cleared by user" — distinguished from "not set" in the merge logic via `"notes" in override`. This means a user can deliberately remove a CSV-provided note and have that override stick. Small but correct semantic choice.
- **Did not add a "Saved" flash.** The status dropdown shows the new value instantly; the notes input retains the typed text. Both are inherent confirmation. Adding a flash would be decorative complexity for marginal benefit.
- **Visual urgency: color + dot, not color alone.** Three tiers (red <30d/expired, amber 30-90d, green >90d, no dot when no expiration). The dot is additive because color alone fails for colorblind users.
- **No `Card` component.** Used semantic divs and borders for the header section. Card would be one more shadcn install for a layout this simple.
- **Used `use(params)` to unwrap.** Next.js 16 makes `params` a Promise even in client components; `use()` is the documented unwrap path. Correct API for the version.
- **Caught a UTC vs local-midnight parsing bug** in the REFERENCE_NOW constant. `new Date("2026-01-30")` parses as UTC midnight, which in my local timezone (America/Los_Angeles, UTC-8) renders as "January 29" — a one-day-off display bug I would have shipped. Agent verified the stalled count didn't change (`differenceInDays` measures full 24h periods, so the 8-hour TZ shift doesn't cross day boundaries in any comparison), then fixed by switching to the local-midnight constructor `new Date(2026, 0, 30)`. Defensive against a bug I likely wouldn't have noticed.

#### My critical engagement

The biggest judgment call this segment was about the **future-date artifact** — and specifically, deciding what *not* to build to solve it.

The artifact: with `REFERENCE_NOW = 2026-01-30`, 90 of 620 doc rows (~14.5%) have `date_received` values in the future relative to "now." Most visibly, this creates rows where the status reads "Received" but the date column reads "Not yet received." Internally consistent (the system thinks the doc hasn't been received yet by the reference date), but visually awkward.

Three options I considered:

1. **Move the reference date forward** to eliminate future-dated `date_received` values. Pushing to ~2026-02-12 would do it but eliminates all 4 on-track applications, leaving the Stalled filter functionally equivalent to the All filter. Worse trade-off than the artifact.
2. **Build a date picker** to let the user pick "now." Tempting because it makes the limitation disappear, but: it's solving a development-time problem with a user-facing feature, it's explicit scope creep against the V1 scope doc, and it suggests I couldn't make a clean engineering judgment myself — which is the opposite of the signal I want to send.
3. **Keep the current anchor, surface the trade-off explicitly.** Add one line of muted text to the list-view header making the reference date visible to viewers ("Reference date: January 30, 2026 — sample data is a snapshot"), and explain the trade-off in 25 seconds during the demo.

**Picked option 3.** The decision is well-reasoned, the artifact is bounded (14.5% of rows, mostly invisible unless you drill into a stalled app's details), and the demo narration turns it into evidence of engineering judgment rather than a flaw to hide.

#### Spot-check result

Asked the agent to simulate marking "Business Licenses & Permits" as Received on GreenLeaf Landscaping (one of the 4 on-track apps) and report the effect. Result chained cleanly:

| State | Received | Pending | % | Stalled |
|---|---|---|---|---|
| Before any edit | 3 | 6 | 33% | no |
| After 1 edit | 4 | 5 | 44% | no |
| After all Pending → Received | 9 | 0 | 100% | no |

Stays on-track throughout because the app is only 4 days old at the reference date — too young for the 14-day Pending threshold to fire even at 6 pending docs. Completeness climbs predictably. This proves the override layer wires correctly through the data loader → derived state → UI.

#### Data weirdness worth knowing about

- **90 of 620 docs (~14.5%) have `date_received` > REFERENCE_NOW** and will display as "Not yet received." Breakdown by status: 37 Received, 32 Approved, 14 Under Review, 7 Expired.
- **The 7 Expired-with-future-date_received rows** are the oddest case in the data — "received in the future, then expired." Almost certainly noise from however the sample data was generated. The tightened Expired rule from segment 2 (requires `expiration_date ≤ now`) means these don't trip stalled detection regardless, but they'll look strange if a user opens one and sees Status=Expired + Received="Not yet received" + an expiration date.
- **The combination matters for demo narration.** Worth a one-line acknowledgment during the demo: *"You'll see a few rows where the status disagrees with the date — that's an artifact of fixed-reference-date evaluation against snapshot data."*

#### What I'm doing before the next segment

1. Browser sanity-check the three things that prove localStorage actually works end-to-end: edit a status → refresh → still there; edit a status → back to list → completeness reflects change; DevTools confirms the JSON shape under `newity-doc-checklist-v1`.
2. Added a one-line reference-date indicator to the list view header so the snapshot framing is visible to anyone using the app (not just discoverable through the demo narration).
3. Commit before moving to the expiring-soon view.

### Build segment 4: Expiring-soon view with cross-application triage

**Tool:** Claude Code
**Duration:** ~25 minutes
**Raw transcript:** Same Claude Code session as segments 1–3; exported at end of build to `ai-evidence/build-session.jsonl`

#### Prompt strategy

Shortest segment so far because most of the work was composition rather than new logic. The prompt was correspondingly tight, but three things baked in still paid off:

- **Explicit selection rule, with the data-quality consistency lock.** Specified that docs with `Expired` status but no `expiration_date` are excluded — same rule applied in segment 2 stalled detection. Without this lock, the agent could have reasonably included them and silently broken the consistency story across views.
- **Pre-empted the "filter by status" mistake.** The prompt called out: "Do not filter by current status. An Approved doc expiring in 5 days still belongs here." That's exactly the team's pain point this view solves — and exactly the failure mode where a less-careful prompt would produce a view that hides the most important rows.
- **Sanity-check on both ends of the sort.** Asked for the top 5 *and* bottom 5 by urgency. With only 7 total rows the lists overlap, but the discipline of checking both ends is what catches sort bugs that only manifest in the middle of large lists. Worth doing every time.

#### What the agent produced

- `src/app/expiring-soon/page.tsx` — cross-application list of every doc expiring in the next 30 days (or already expired), sorted by `expiration_date` ascending.
- Header with split count: "5 expired · 2 expiring in next 30 days" — two numbers, not one combined, because the split is informative.
- Per-row: business name (linked to detail view), document type, current status badge, expiration date with relative descriptor ("Expired 106 days ago" / "Expires in 8 days"), urgency dot matching the detail view's color tiers.
- `"Expiring soon (7)"` button-styled link added to the list-view header, count derived from the same selection function the page uses so they cannot drift.

#### Decisions the agent made (and surfaced)

- **Extracted `urgencyTier()` into `derived.ts`** as a shared helper. The detail view now imports it; the expiring-soon view imports it. Single source of truth for "when is a date urgent."
- **Did NOT extract the color-class mapping.** Strong distinction the agent flagged in its own words: the tier function is *policy* (when something is urgent — drift here is a real bug); the color classes are *presentation* (how urgent looks — drift here is a style nit, visible on inspection). Two different responsibilities, two different change frequencies; not worth the indirection.
- **Extracted `selectExpiringDocs(apps, now, daysAhead)`** so both the page and the list-view header count call the same function. Stay-in-sync guarantee for free.
- **Used `buttonVariants()` className on a Next.js `Link`** rather than wrestling with base-ui Select's `asChild` render-prop pattern. Same visual result, cleaner code.

#### My critical engagement

The product insight that emerged from this segment is worth more than the feature itself: **all 7 entries in the expiring-soon view are "Bank Statements (90 day)."** The agent surfaced this — other expiration-bearing docs in the data (tax returns, business licenses) have multi-year expirations that fall outside the 30-day window. Bank statements are the only short-lived doc type.

That reframes what this view is for. It's not a generic "documents expiring soon" list — it's a **bank-statement-refresh triage queue**. Which is a known loan-ops workflow concern, and which the team's spreadsheet would specifically miss because the spreadsheet tracks status, not expiration. Built-in demo narrative.

The other thing worth flagging: the **"Approved but expired"** rows (Northstar Accounting, Crown Jewelers in the screenshots) are this view's strongest argument for existing. A doc that's been approved and forgotten, then expires underneath the team, is exactly the kind of failure mode the current workflow can't catch — and exactly what this view surfaces. The decision to make selection driven by `expiration_date` instead of `status` is what makes this work.

#### What I'm doing before the next segment

1. Browser sanity-check: confirmed "Expiring soon (7)" button renders, page loads, top row is Hilltop Dental Care, business names are clickable links.
2. Committed with message "Build segment 4: expiring-soon view with cross-app expiration triage (7 docs: 5 expired, 2 in next 30d)".
3. V1 is feature-complete at this point — three views shipped per the original scope doc. Subsequent segments (dashboard, data quality callout) are documented as scope adjustments, not V1 work.

### Build segment 5: Leadership dashboard (scope adjustment, not V1)

**Tool:** Claude Code
**Duration:** ~18 minutes (against a hard 35-minute ceiling)
**Raw transcript:** Same Claude Code session as segments 1–4; exported at end of build to `ai-evidence/build-session.jsonl`

> **Note on scope:** This segment is documented honestly as a scope expansion, not as V1 work. The leadership dashboard was explicitly cut in the original scope doc and in the Phase 2 AI log entry ("different user with separate needs, V2 work"). I reintroduced it after V1 was feature-complete because — and only because — the underlying derived-state layer I'd already built made it composable rather than original. The weekly-email auto-generation piece of the team's original ask stays a V2 item. See `scope-doc.md` for the "Scope adjustments during build" section that captures this honestly.

#### Prompt strategy

Two things baked into the prompt that protected the time budget:

- **Hard ceiling: 35 minutes.** Stated explicitly in the prompt, with the instruction "if this segment crosses 35 minutes, stop and ship what you have. Better a partial dashboard than a late submission." Hard ceilings work better than soft estimates when scope is at risk.
- **No new derived helpers unless absolutely necessary.** Reusing `deriveStatus` and `selectExpiringDocs` was the difference between a 30-min build and a 60-min build. The prompt was explicit about this: per-processor breakdown is a `useMemo` reduction inline in the page, not a new file.

#### What the agent produced

- `src/app/dashboard/page.tsx` — three sections: stat-card row (active apps, pipeline value, stalled rate, expiring count), per-processor workload table (sorted by stalled rate descending — worst first, which is the team-lead triage need), top 5 most overdue applications (ranked by stalled-doc count, business name links to detail view, stalled reasons inline).
- "Dashboard" button-styled link in the list view header, next to the existing "Expiring soon (N)" button. Same `buttonVariants` pattern.
- No new shadcn components, no charts, no new dependencies.

#### Decisions the agent made (and surfaced)

- **Added `stalledDocCount: number` to `DerivedApplicationStatus`.** Computed during the existing `deriveStatus` walk as `pendingStalled + underReviewStalled + expiredCount`. This let the top-5 ranking sort without duplicating the rule logic or string-parsing the human-readable `stalledReasons`. Single new field, no new helper, no policy duplication. **Accepted — exactly the right shape for this use case.**
- **Two-line stat card for stalled rate** ("56 of 60" main, "93%" subtitle) instead of one combined number. The split is informative: the team lead cares about the absolute count for triage and the rate for trend awareness. Same data, two different reading modes.
- **Section C uses a flat list, not a table** — visually distinct from the per-processor table above it. Per-row layout: business name (linked) + processor/date subtitle + stalled-reasons line, with the stalled-doc count right-aligned. Read as "here are five things to look at," not "here is data to sort and filter."
- **Tiebreaker decision deferred.** Three apps tie at 8 stalled docs (Bluebird, TechStart, Elite Fitness). Order across the three reflects CSV order. Agent flagged this as a place where a stable tiebreaker (older app date first) would be the obvious next step. Left as-is for V2.

#### My critical engagement on the scope decision

The honest question I had to answer before running this segment: *Is adding this feature, after the scope doc explicitly cut it, the right call?*

My reasoning:

1. The cost was real but bounded — 35-minute hard ceiling, actual 18 minutes.
2. The underlying derived layer was already doing the aggregation. The dashboard composes existing helpers; it doesn't introduce new business logic.
3. The cut in the original scope doc was about *the weekly auto-generated email*, which is still cut. The snapshot view is a leaner subset.
4. Honesty about the expansion preserves the scope-discipline narrative. The scope doc gets a "Scope adjustments during build" section, not a quiet rewrite of the original V1 list. The git history shows: cut → built V1 → reintroduced as documented adjustment. That's an honest engineering trail.

If any of those four had been different — if the derived layer hadn't been there, if I'd run over the ceiling, if the original cut had been about exactly this snapshot view, or if the only way to fit it was to silently rewrite the scope doc — I would have left it cut.

#### Demo-relevant findings worth surfacing

- **Janet Morrison is 18/18 stalled — 100%.** Per-processor view makes this visible; the team lead's current spreadsheet cannot.
- **4 of the 5 most overdue applications belong to Ricardo Fuentes.** Not necessarily a Ricardo problem — could be workload imbalance, doc-mix variance, or process drift — but it's a question the team lead would never have known to ask without this view.
- **Maple Street Deli leads everyone at 9 stalled documents.** Aisha's only stalled-with-9 app and the single-worst case across the entire pipeline. Specific, namable, actionable.

#### What I'm doing before the next segment

1. Browser sanity-check the dashboard renders all three sections, "Dashboard" link in header navigates correctly, numbers match the earlier exploration script (60/$15.6M/56-of-60/7 across the four cards).
2. Committed with message documenting this as a scope adjustment, not V1.
3. Adding a "Scope adjustments during build" section to `scope-doc.md` to capture this honestly.

### Build segment 6: Data quality callout — built, then cut

**Tool:** Claude Code
**Duration:** ~25 minutes total (7 min initial build + 10 min dropdown + 5 min reframe + 3 min revert)
**Raw transcript:** Same Claude Code session as segments 1–5; exported at end of build to `ai-evidence/build-session.jsonl`

> **Note on scope:** This segment documents work that was built, iterated, and then deliberately removed from the final submission before code freeze. The git history shows the full arc: initial callout → dropdown disclosure → text reframe → revert. The decision to cut it was the most important engineering judgment moment in this segment.

#### What I was trying to surface

In segment 2, I found that 27 of 37 documents marked "Expired" in the data have no `expiration_date` populated. I tightened the stalled-detection rule to require evidence (an actual expiration date in the past), which excluded these docs from automated stalled detection but left them as a data-quality finding that should be visible somewhere.

The instinct: surface them in the UI as a "data quality" callout so the team can see what was deliberately excluded and why.

#### What got built

**First pass (~7 min):** A small bordered callout on the list-view header. Heading "Data quality," body text noting the 27-doc count and recommending manual review. Static, informational, no interaction.

**Second pass (~10 min):** Added a `<details>` disclosure to expand the list of affected docs. Each row showed business name (linked to detail view) and document type. Native HTML element, no JS state, default browser styling. The dropdown made the callout feel more substantial.

**Third pass (~5 min):** Realized the body text said "manual review recommended" — implying the user could fix it from this UI. But `expiration_date` isn't editable in V1 (deliberate scope decision). So "manual review" pointed at a path that didn't exist. Reworded the text to surface it as a signal, not a to-do: "These represent data entry gaps in the source system."

#### Why I cut it

After the reframe I sat with it and recognized the implementation was a single hardcoded check (`status === 'Expired' && !expiration_date`) presented under a "Data quality" heading. The framing overpromised. A general data-quality system catches multiple kinds of issues; this one catches exactly one. The label set an expectation the code couldn't meet.

Two paths forward:

1. **Build out a real data-quality framework** (multiple checks, configurable rules, severity tiers) — way out of scope for V1 and would have eaten the remaining time budget.
2. **Cut the feature, surface the 27/37 finding through the demo narrative instead.**

Option 2 wins on three dimensions:

- **The engineering insight survives.** It's still in this AI log, will be in the demo, and motivates the tightened stalled rule. Nothing is lost; the artifact moves from UI to narration.
- **The scope story gets cleaner.** One deliberate adjustment (dashboard), not two. Sharper signal on scope discipline — exactly what the brief is testing for.
- **The brief is explicit on this.** "Telling us your tool is perfect is a red flag." Cutting your own work because it doesn't earn its place is the opposite of that red flag.

#### My critical engagement

This was the strongest scope-discipline moment in the build. Three things made the cut possible:

1. **Willingness to look at what I'd built and ask whether the label matched the code.** "Data quality" was aspirational; the implementation was a single check. Mid-build, with momentum behind shipping it, the temptation is to keep the feature and rationalize the framing. The right move was the other direction.
2. **The time investment was small (~22 min) and recoverable.** Sunk cost wasn't strong enough to justify shipping a weak feature.
3. **A clear alternative existed.** The insight didn't disappear — it just moved from UI to narration. That's a real path, not a face-saving rationalization. The 27/37 finding still lands in the demo when explaining why the Expired rule was tightened.

If a reviewer reads this segment and thinks *"she built it and then deleted it"* — that's exactly the read I want. The build process surfaced a real insight; the right artifact for that insight wasn't a UI feature.

#### What I'm doing before Phase 4

1. Code reverted cleanly. The list-view header is back to title + count + reference date + buttons. No orphaned imports, no dead helpers, no unused state. TypeScript clean. `/` returns 200.
2. Updated `scope-doc.md` "Scope adjustments during build" section: dashboard stays as the one adjustment; data quality callout is documented as "considered and removed" so the build history is honest in the scope doc as well as here.
3. Demo narration will surface the 27/37 finding during the stalled-detection segment, with the explicit framing: *"I built a callout for this and then cut it because the label overpromised what the code did. The right place for this insight is in the conversation with the team, not as a UI feature dressed up as a data quality system."*

---

## Phase 4: Testing

**Date:** 05/19/2026
**Tool:** Claude Code (same session as Phase 3 build segments)
**Output:** `src/lib/derived.test.ts` (22 tests, 100% pass)
**Goal:** Cover the high-value pure-function logic with focused tests. Skip UI/component tests entirely. Treat the test file as a second piece of executable documentation for the rules.

### Prompt strategy

I had reversed an earlier Phase 1 decision (the "skip tests, write a QA plan instead" decision) once V1 was feature-complete and I had time to spare. The prompt baked in three things:

- **Explicitly named what NOT to test.** UI components, CSV parsing, date-fns date math, localStorage browser integration. Each had a one-line rationale in the prompt and the agent was instructed to leave a comment in the file for each skipped category. This makes the omissions visible rather than invisible — a reviewer can see the testing strategy at a glance.
- **Required boundary-pin tests on `urgencyTier`.** Day 30 → amber vs. red is a one-character difference in the implementation (`<` vs `<=`). Without a pinned test, the implementation's behavior is ambiguous to anyone reading the code later. The prompt called for these tests with a comment explaining the choice — turning code ambiguity into documented behavior.
- **Required inline fixtures.** No reading from the real CSV. Each test owns a small hand-built fixture that obviously illustrates the case being tested. The test file reads top-to-bottom as a spec, not as a "fixture wrangling" exercise.

### What the agent produced

`src/lib/derived.test.ts` with 22 tests, all passing on first run in 699ms:

- **`deriveStatus` (12 tests):** happy path, the three stalled triggers (pending >14d, under review >7d, expired with date), the two data-quality edge cases (Expired without date excluded, Expired with future date excluded), completeness math with Not Required excluded from denominator, the Under-Review-counts-as-received design call, and reason-string formatting.
- **`urgencyTier` (7 tests):** null → "none", boundary pins at exactly 30 days and exactly 90 days (with comments explaining the implementation choice so a future threshold tune fails loudly), negative-days (expired), single-day-out, and far-future cases.
- **`selectExpiringDocs` (3 tests):** cross-app sort by expiration ascending, exclusion of docs without `expiration_date`, respect for the `daysAhead` cutoff.

Zero TypeScript errors. Test runner installed as `vitest` with `npm run test` and `npm run test:watch` scripts.

### What stood out — honest framing

**Nothing failed on first run.** The agent flagged this as itself a small surprise and gave it the right framing: the tests don't catch new bugs because the rules are simple enough that the implementation already matched. What they *do* catch is regression. A future change to the Expired rule that accidentally removes the `expiration_date` requirement would fail two tests immediately. A change to the day-30 boundary would fail the pin test. That's the actual value here, and it's worth being honest about.

**The most expressive test in the file is the Under-Review dual-role test.** It encodes a design decision ("Under Review counts as received for completeness, but trips stalled detection when aging — same data, two different questions, two different answers") that would otherwise live only in a code comment in `derived.ts`. The test pins both the rule *and* the rationale.

### What I'd test next (V2 priority)

A round-trip integration test on the data loader (`src/lib/data.ts`). The loader is the single boundary between external data and the derived layer. Every test in `derived.test.ts` validates behavior *given* well-formed `Application[]`. If the loader silently mis-parses a column or drops a doc, every derived calculation downstream is wrong and no current test catches it.

A single ~30-line loader test would feed a small in-memory CSV string + a mocked `getOverrides()` return value through `loadApplications()` and assert:

- `loanAmount` becomes a number, not a string
- Empty string fields become null
- Override `status` wins over CSV status when both exist
- Override `notes: null` (explicit clear) wins over CSV non-null notes (the `"notes" in override` distinction is subtle and easy to break)
- Doc ID format is `${appId}-${documentType}`

This is the highest-blast-radius gap in current coverage — the loader is where the most consequential silent breakage can happen.

### My critical engagement

- **Decided to skip writing the loader test myself** despite knowing it was the most valuable next test. Time-budget call: it would have taken ~15 min, which I needed for README and demo recording. Documenting it in the QA plan and the demo narrative is the honest trade.
- **The boundary-pin tests are the strongest demo moment in this phase.** Most candidates' unit tests are "does the happy path work." Boundary pins say "I know exactly where the implementation's behavior is ambiguous, and I've made it explicit." That's a different level of testing thinking.
- **Reversed my Phase 1 decision.** Phase 1 captured my decision to skip tests in favor of feature work — at the time, with no time to spare, that was the right call. After V1 was feature-complete and I'd cut a segment-6 feature, I had room to do tests AND the bonus signal was worth claiming. The reversal is itself a piece of engineering judgment under changing constraints.

### What I'm doing before Phase 5

1. Committed the test suite with message documenting the 22-test count and the deliberate non-coverage.
2. Moving directly into Phase 5: README + self-assessment + demo script.
3. The loader integration test gets a dedicated bullet in the README's QA plan section, framed as the V2 priority.

---

## Phase 5: Documentation

**Date:** 05/19/2026
**Tool:** Claude (web)
**Output:** `README.md`, `scope-doc.md` (Scope adjustments section), `ai-log.md` (this document), demo script outline
**Goal:** Convert the build artifacts and engineering decisions into shipping documentation. README clear enough that a reviewer can run the project in under 5 minutes; self-assessment honest enough to pass the brief's "telling us your tool is perfect is a red flag" test; demo script tight enough to land under 10 minutes.

### Prompt strategy

By Phase 5 the AI was no longer producing decisions — it was converting decisions into structured prose. Three things made this phase efficient:

- **Context was already loaded.** Every document I drafted in Phase 5 referenced material from earlier phases: the scope doc, the AI log, the screenshots, the test output. The AI didn't need to re-derive anything; it was working with material already on the table.
- **Tone and length were specified up front.** "Section structure first, then prose," "no buzzwords or generic engineering filler," "self-assessment must name six real limitations, not three sanitized ones." Drafts came back at the target length and tone on the first pass instead of needing iteration.
- **Cross-document consistency was the explicit goal.** The README's QA plan section, the AI log's Phase 4 entry, and the demo's testing narrative all need to say the same thing about the loader integration test being the V2 priority. The AI flagged this proactively and reused language across documents so they reinforce rather than contradict.

### What got drafted with AI

- **`README.md`** — Quick start, what's built, stack, reference-date explanation, key design decisions, self-assessment (what's solid / what's rough / what's next), QA plan, repo structure.
- **`scope-doc.md` "Scope adjustments during build" section** — The honest record of the dashboard expansion and the data quality callout build-and-cut. Includes a summary table showing V1 + adjustment + cuts.
- **Per-segment AI log entries** — Each Phase 3 segment got a structured entry covering prompt strategy, what was produced, decisions surfaced, my critical engagement, and what's next. Written in real time or near-real-time as each segment finished.
- **Demo script outline** — Coming next as a separate Phase 5 sub-output.

### My critical engagement

Specific places I edited or overrode what came back:

- **Trimmed self-assessment dressing.** First drafts of the "what's rough" section had each limitation softened with hedging language ("could potentially be improved by..."). I rewrote them as direct statements of fact — "stalled-detection thresholds are hardcoded," "no audit log," "no accessibility audit." The brief is explicit that honesty about fragility is the signal, not graceful framing.
- **Cut the "polish" framing throughout.** AI drafts kept reaching for "polished UI" or "clean design" language. The brief is explicit that polish isn't evaluated. Reframed every instance toward usability or product judgment instead.
- **Pushed back on a data quality callout dropdown.** Mid-Phase-3, the AI suggested expanding the data quality callout into an interactive disclosure showing affected docs. I built it, then sat with it and realized the framing overpromised what the code did. Cut it before submission — see segment 6 of this log. This is captured here because the *decision to cut* came out of a documentation moment (writing the README description of the feature exposed how thin the implementation was relative to the label).
- **Owned the demo narrative explicitly.** AI suggested several phrasings for the 27/37 finding in the demo segment. I picked the one that frames the cut as judgment rather than face-saving: *"I built a callout for this and then cut it because the label overpromised what the code did. The right place for this insight is in the conversation with the team, not as a UI feature."*

### What I'm doing before submission

1. Final commit of all documentation files.
2. Export Claude Code session transcript to `ai-evidence/build-session.jsonl`.
3. Record demo video against the script outline.
4. Submit per the email instructions.

### Total time accounting

| Phase | Approx. duration |
|---|---|
| Phase 1 — Understanding | 20 min |
| Phase 2 — Scoping & Planning | 15 min |
| Phase 3 — Building (6 segments, includes debug + cut work) | ~3h |
| Phase 4 — Testing | 20 min |
| Phase 5 — Documentation + demo recording | 20 min |
| **Total** | **~3h 55m** |

Came in just under the 4-hour cap. The build itself stayed within its scope-doc time plan; documentation and demo recording were intentionally lean. The cap held because the scope held — three V1 views, one documented adjustment (dashboard), one feature built and cut (data quality callout), and a focused test suite. Cutting the data quality callout mid-build was what created the buffer for tests + docs + recording without overrun.

---
