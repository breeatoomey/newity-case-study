# AI Usage Log — NEWITY Product Engineer Assessment
 
Primary tools: Claude Code (build), Claude in VS Code via extension (side conversations, doc work, pressure-testing decisions).
 
This log captures intentional AI usage across each phase of the assessment — Understanding, Scoping & Planning, Building, Testing, and Documentation. Each entry includes the prompt I gave, the substance of the AI response, and the decisions I made (including where I overrode AI recommendations).
 
---
 
## Phase 1: Understanding
 
**Date:** 05/17/2026
**Tool:** Claude (web)
**Goal:** Before writing any code, interrogate the brief itself — what is actually being tested, what's the highest-leverage scope, and what are the failure modes.
 
### Prompt
 
> I'm starting a 3–4 hour take-home for a Product Engineer role at a fintech that facilitates SBA loans. The deliverable is a browser-based tool replacing a shared spreadsheet their loan ops team uses to track SBA document checklists. I've attached the full brief and the sample CSV (~620 rows, 60 applications × 12 document types).
>
> Before I write a single line of code, I want to use AI to interrogate the brief itself. Specifically:
> 1. What is the assignment actually testing — beyond the surface feature list?
> 2. The brief lists 5 requested features and explicitly says I can't build all of them. Which are the highest-leverage to build, and which should I cut? What's the reasoning?
> 3. What are the failure modes — what would cause a strong candidate to bomb this?
> 4. Walk me through the sample data so I understand the shape of the problem before I model it.
> 5. Sketch a 4-hour time budget across the three phases (Build, Demo Video, AI Log).
>
> Push back if my framing is off. I'd rather get an honest read now than discover gaps mid-build.
 
### Key insights from the AI response
 
**The brief is a deliberate scope trap.** The line *"knowing when to stop is part of what we're evaluating"* and the explicit ban on going over 4 hours both signal that scope discipline is being graded as heavily as the build itself. A candidate who tries to ship all 5 requested features in 8 hours fails the assessment by definition.
 
**The team's stated pain point is the north star.** Buried in the requirements Q&A: *"Not knowing which applications are stalled waiting on documents. Things fall through the cracks."* Any feature that doesn't directly attack this is lower priority. This reframes the build from "spreadsheet replacement" to "stalled application detector."
 
**Recommended scope — build:**
1. Application list view with completeness + stalled-status indicators
2. Application detail view — drill into all 12 doc types per application, update statuses inline, expiration dates rendered with visual urgency (red / yellow / green by days-until-expiry)
3. Global expired / expiring-soon view — the team's expiration concern fused with the outstanding-items filter into a single triage surface
**Recommended scope — cut (and explain in demo):**
- Email alerts — real email infra is a 2-hour rabbit hole (deliverability, templating, scheduling, suppression). V1 surfaces expiring items prominently in the UI instead.
- Leadership dashboard / weekly summary auto-generation — separate user with separate needs (weekly cadence, aggregate view). V2 work.
- Multi-user real-time sync — only 3 users, low concurrency risk. Optimistic local updates are enough for V1.
- Auth / permissions — explicit non-goal in brief.
- Persistence beyond `localStorage` — defensible V1: source of truth stays the spreadsheet, this tool is a productivity layer on top. V2 adds a backing store.
**Failure modes flagged:**
- Over-scoping → blowing the 4-hour budget.
- Building polished UI at the expense of clear product decisions (brief explicitly says polish isn't evaluated).
- Treating the AI log as an afterthought (brief explicitly calls it the *most important deliverable*).
- Claiming the tool is perfect in the self-assessment (brief explicitly calls this a red flag).
**Data shape (verified by AI inspecting the CSV):**
- 620 rows, 60 applications, 12 doc types, 3 processors (Aisha Patel, Janet Morrison, Ricardo Fuentes), 6 statuses (Pending, Received, Under Review, Approved, Expired, Not Required)
- ~78% of rows have no `expiration_date` (correct — most doc types don't expire; Bank Statements 90-day and Tax Returns 3-year are the expiry-relevant types per the brief)
- ~34% of rows have notes
- Data is clean — no nulls in required fields, no obvious junk rows
**Time budget:**
 
| Block | Duration | Activity |
|---|---|---|
| 0:00–0:30 | 30 min | One-page scope doc + AI log skeleton |
| 0:30–1:00 | 30 min | Scaffold project, define data model |
| 1:00–2:45 | 1h 45m | Build the three core features |
| 2:45–3:15 | 30 min | Polish, README, self-assessment write-up |
| 3:15–3:45 | 30 min | Record demo video |
| 3:45–4:00 | 15 min | Buffer / final review / submit |
 
### My decisions
 
- **Scope:** Accepting the recommended cut list. Building the three core features. Will defend cuts explicitly in the demo, framed against the team's stated pain point.
- **Stack:** Next.js + React + Tailwind + shadcn/ui, built in Claude Code with Claude in VS Code for side conversations. `papaparse` for CSV ingest. `localStorage` for in-session persistence. No backend.
- **North-star feature:** The stalled-application surfacing. Everything else flows from this.
- **Demo framing:** Stakeholder demo, not code review. Lead with the team's pain point quote, then trace each built feature back to it. Cuts get their own segment with reasoning.
- **Self-assessment angle:** Be explicitly honest about what's fragile — localStorage means no real persistence, no concurrent-edit handling, single-user assumption baked in. Naming these is the point of the section.
### Pressure-testing the AI's recommendation
 
Places I challenged the AI's framing and either accepted, modified, or overrode:
 
- **Considered adding Firebase for persistence** (familiar from prior work). AI pushback: setup eats ~45 min for marginal V1 value, and "source of truth is the spreadsheet" is a more defensible V1 story than half-built real persistence. **Accepted.**
- **Considered building the leadership dashboard as a 'free' feature** given the data shape. AI pushback: it's a separate user with separate needs (weekly cadence, aggregate view), and building it would dilute the operational-view focus. V2 framing is stronger than a half-built feature. **Accepted.**
- **Considered writing automated tests.** Brief calls tests "a bonus" but says thinking about testing is required. Decision: write a QA plan section in the README and cover testing approach verbally in the demo, instead of spending build time on tests at the cost of scope. **My call — overrode the AI's leaning toward writing a minimal test suite.**
- **Considered an inline edit UX vs. modal-based editing for status changes.** AI suggested modal; I'm going with inline because non-technical users move faster when there's no extra click and the spreadsheet they're replacing also edits in place. **My call.**
---
 
## Phase 2: Scoping & Planning
 
**Date:** 05/17/2026
**Tool:** Claude (web)
**Output:** `scope-doc.md` (one-page scope document)
**Goal:** Translate the Phase 1 analysis into a concrete one-page scope doc that drives the rest of the build.
 
### Prompt
 
> Based on the Phase 1 analysis we just did, co-draft a one-page scope doc with me. Structure I want: the problem statement (in the team's own words where possible), a single north-star user goal, the V1 feature list in priority order, an explicit cut-list with V2 framing for each cut, tech stack with one-line reasoning per choice, the data model in TypeScript, a time plan with a fallback if I run over, and a draft self-assessment I can refine after building. Be specific — no vague language. If a feature is in V1, define exactly what it does in 2-3 bullets. If it's cut, give me the actual reason and what V2 would look like.
 
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
- **Doc-count formula:** `Received | Approved | Under Review` count as received; `Pending | Expired | Not Required` count as pending. **Need to verify this matches how the ops team thinks.** Will validate in Phase 2 session (stalled detection logic).
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
 
#### What I'm doing before the next session
 
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
 
---
 
## Phase 4: Testing
 
*QA plan and testing decisions.*
 
---
 
## Phase 5: Documentation
 
*README, self-assessment, and demo narrative.*