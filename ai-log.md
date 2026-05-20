# AI Usage Log - NEWITY Product Engineer Assessment

Primary tools: Claude Code (build), Claude in VS Code via extension (side conversations, doc work, pressure-testing decisions).

This log captures intentional AI usage across each phase of the work — Understanding, Scoping & Planning, Building, Testing, and Documentation. Each entry includes the prompt I gave, the substance of the AI response, and the decisions I made (including where I overrode AI recommendations).

-----

## Phase 1: Understanding

**Date:** 05/17/2026
**Tool:** Claude (web)
**Goal:** Before writing any code, develop a clear understanding of the team’s workflow problem, identify the highest-leverage features for solving it, and explore the shape of the sample data.

### Prompt

> I’m building a browser-based tool to replace a shared spreadsheet that the loan operations team uses to track SBA document checklists. I’ve attached the brief and the sample CSV (~620 rows, 60 applications × 12 document types). Build time available is roughly 3–4 hours.
> 
> Before I write a single line of code, I want to think through the problem itself. Specifically:
> 
> 1. What’s the actual workflow pain this team is experiencing? What’s the underlying problem behind the surface feature requests?
> 1. The brief lists 5 requested features. Which would deliver the most value to a 3-person ops team, and which are nice-to-haves vs. essentials?
> 1. What does the sample data actually look like? What’s the shape of the problem before I model it?
> 1. What’s a realistic time plan that leaves room for both building and clearly communicating what was built?
> 
> Push back if my framing is off. I’d rather get an honest read now than discover gaps mid-build.

### Key insights from the AI response

**The team’s stated pain point is the north star.** Buried in the requirements Q&A: *“Not knowing which applications are stalled waiting on documents. Things fall through the cracks.”* This reframes the product from “spreadsheet replacement” to “stalled application detector.” Every feature decision should trace back to this pain — including the decision to *not* build features that don’t directly attack it, even if they were explicitly requested.

**Three features deliver the most value to a 3-person ops team:**

1. **Application list view** with completeness and stalled-status indicators — the surface where processors see “what needs attention right now.”
1. **Application detail view** — drill into all 12 doc types per application, update statuses inline, expiration dates rendered with visual urgency (red / amber / green by days until expiry).
1. **Global expired / expiring-soon view** — a triage surface that catches docs the team approved and then forgot about.

**Lower-leverage requests, treated as V2 work:**

- Email alerts (high-cost infra for a 3-user team; UI surfacing delivers the same outcome)
- Leadership dashboard / weekly auto-generation (different user, different cadence)
- Multi-user real-time sync (3 concurrent users, low concurrency risk)
- Authentication (explicit non-goal)
- Persistence beyond `localStorage` (CSV remains source of truth; this tool is a productivity layer)

**Data shape (verified by AI inspecting the CSV):** 620 rows, 60 applications, 12 doc types, 3 processors, 6 statuses. ~78% of rows have no `expiration_date` (correct — most doc types don’t expire). ~34% have notes. Data is clean.

### My decisions

- **Scope:** Three core features. Other requested items get V2 framing in the demo.
- **Stack:** Next.js + React + Tailwind + shadcn/ui, Claude Code for the build. `papaparse` for CSV. `localStorage` for persistence. No backend.
- **North-star feature:** Stalled-application surfacing.
- **Self-assessment angle:** Be explicit about what’s fragile — naming limitations honestly is more useful than smoothing them over.

### Pressure-testing the AI’s recommendations

- **Considered Firebase for persistence.** AI pushback: ~45 min setup for marginal V1 value. **Accepted the cut.**
- **Considered the leadership dashboard as a ‘free’ feature.** AI pushback: different user, different cadence, dilutes operational focus. **Accepted the cut.**
- **Considered writing automated tests upfront.** Decision: prioritize V1 features over test coverage before rules are settled. **Overrode the AI’s leaning toward minimal tests.**
- **Modal vs. inline editing.** AI suggested modal; I picked inline because users moving from a spreadsheet expect in-place edits. **My call.**

-----

## Phase 2: Scoping & Planning

**Date:** 05/17/2026
**Tool:** Claude (web)
**Output:** `scope-doc.md` (one-page scope document)
**Goal:** Translate the Phase 1 analysis into a concrete scope doc that drives the rest of the build.

### Prompt

> Based on the Phase 1 analysis we just did, co-draft a one-page scope doc with me. Structure I want: problem statement, single north-star user goal, V1 feature list in priority order, explicit cut-list with V2 framing for each cut, tech stack with reasoning, data model in TypeScript, time plan with a fallback if I run over, draft self-assessment. Be specific, no vague language.

### Co-drafting process — places I changed the draft

- **Stalled thresholds.** Draft suggested 7 days for `Pending`. I changed to 14 days (waiting on borrower) and kept 7 days for `Under Review` (waiting on processor). Two different SLAs for two different parts of the workflow.
- **Inline-only editing.** Draft offered both modal and inline. Committed to inline-only — fewer clicks, closer to the spreadsheet mental model.
- **Cut justification for the dashboard.** Sharpened “different user, different needs” to “different cadence” — leadership wants weekly aggregates, ops wants real-time.
- **Time-plan fallback.** Added the explicit rule: if behind at 1:45, expiring-soon view becomes the cut, not the detail view. Detail makes the tool *usable*; expiring-soon makes it *valuable*. Usable wins.
- **Self-assessment “rough” list.** Added the threshold-hardcoding and single-user-assumption items myself — wanted the list to reflect actual technical concerns.

### What I’m using the scope doc for

1. **Anchor for the build** — when I’m tempted to add something mid-build, check the doc first.
1. **Source material for the README.**
1. **Demo script backbone** — same arc: problem → north star → built features → cuts → V2.

-----

## Phase 3: Building

### Build segment 1: Scaffold + raw table render

**Tool:** Claude Code · **Duration:** ~30 min

Used a structured prompt that forced the agent to read `scope-doc.md` before acting, locked the stack explicitly, drew the scope line at scaffold + render only, and required a structured handoff at the end. Output: `create-next-app` with TS/Tailwind/App Router, shadcn/ui initialized, `types.ts` matching the scope doc data model, papaparse CSV loader in `data.ts`, and a working table of 60 applications.

**Two things surfaced worth noting:**

- **Five applications have 8 documents, not 12.** The “60 apps × 12 doc types” framing isn’t universal; the loader handles it gracefully but stalled detection needs to operate on whatever’s in `documents`, not assume a fixed count.
- **`create-next-app` installed Next.js 16, not 14.** Benign — App Router API unchanged. Scope doc says 14; leaving it since the version isn’t load-bearing.

### Build segment 2: List view with stalled detection

**Tool:** Claude Code · **Duration:** ~50 min (build + debug + fix)

#### Prompt strategy

Highest-leverage feature of the build — the north-star view from the scope doc. Three things baked into the prompt that paid off:

- **Locked the categorization rules exhaustively.** “Under Review counts as received for the completeness gauge, but trips stalled-detection when aging. Same data, two different questions, two different answers — explain this in code comments.”
- **Built in a trip-wire.** “Tell me the stalled count out of 60. If it’s 55/60, something is too aggressive; if it’s 2/60, something is too lenient.” Forces validation against an external standard, not just type-check passing.
- **Specified default sort order explicitly** (“stalled first, then by application_date descending”). Defaults are product decisions; implicit ones default to whatever Tailwind examples the agent saw most.

#### The 60/60 problem and how it got solved

The trip-wire fired. Initial stalled count: **60 of 60** — the Stalled filter was equivalent to the All filter. Three things made this a useful debug moment:

1. **The agent surfaced it proactively** before I’d opened the browser. Sanity-check ran before the report.
1. **The agent did exploratory data analysis without being asked.** Computed the stalled count at multiple anchor dates, ran a separate script to investigate the Expired-doc semantics, and surfaced that **27 of 37 Expired docs in the data have no `expiration_date` populated**. That data oddity turned out to be the key insight.
1. **The agent presented four options with tradeoffs** instead of unilaterally picking one. Three defensible; one (gaming the anchor earlier than the most recent application) was incoherent and flagged as such.

Root cause: the sample data is a snapshot from early 2026. Against today’s real date (May 2026), every application is past every threshold.

#### My critical engagement on the fix

Three decisions I made that weren’t in the original spec:

- **Adopted the Expired-date evidence requirement** (require `expiration_date <= now` for Expired status to count). This isn’t a threshold change, it’s a data-quality refinement of an implicit assumption — the original rule assumed Expired status reflected a real expiration event, and the data shows that assumption doesn’t hold. When the data contradicts an assumption baked into the rule, refining the rule is the right call.
- **Set `REFERENCE_NOW = 2026-01-30`.** Earliest coherent anchor (one day after the most recent application_date), which maximizes variation in the stalled signal. Documented in code with a comment explaining why this exists and that production would use `new Date()`.
- **Walked back my own target range.** The original “20-45 stalled” target was based on incomplete data analysis. Once the floor became visible (~26 from Expired alone, ~52 from Pending), I reframed expectations honestly rather than reverse-engineering rules to hit a number. Final: 56/60 stalled, 4 on-track.

#### Why the final state is the right state

56/60 stalled isn’t a tidy number, but it’s the honest one. The four on-track apps are all recent (4–11 days from anchor), which is exactly when the rules should *not* fire. The rule is doing what it’s supposed to.

#### What surprised me about the data (worth telling the team)

- **Most Expired docs aren’t really expired.** 27 of 37 Expired-status docs have no expiration date. The Expired status is being used as a catch-all in the current spreadsheet workflow.
- **Janet’s caseload is 18/18 stalled.** Worth a real conversation: workload imbalance, process difference, or noise in the sample?

### Build segment 3: Detail view with inline editing + localStorage persistence

**Tool:** Claude Code · **Duration:** ~50 min

#### Prompt strategy

Three things baked in:

- **Isolated the localStorage layer as its own module** (`src/lib/storage.ts`) rather than letting the agent inline it. Testable, swappable with a real backend in V2.
- **Pre-empted the future-date artifact.** Initial plan: render `date_received > REFERENCE_NOW` as “Not yet received.” (Later replaced with showing the actual date — see “My critical engagement” below.)
- **Required an integration spot-check.** Asked the agent to simulate a status edit on an on-track app and report what happens to completeness and stalled status — proves the override merge propagates through the data layer.

#### What the agent produced

- `src/lib/storage.ts` — localStorage wrapper with try/catch for private-browsing/unavailable cases
- `src/lib/data.ts` updated — CSV defaults merged with localStorage overrides during load
- `src/app/applications/[id]/page.tsx` — full detail view with inline status dropdowns, inline notes, three-tier visual urgency

#### Decisions the agent surfaced

- **Stable doc-ID format:** `${appId}-${documentType}` rather than global row index. Right key shape for persistence.
- **Notes whitespace handling:** `notes.trim() || null` on save. Whitespace-only clears the note rather than persisting visually-empty content.
- **Override notes shape: `string | null`.** Null = “cleared by user,” distinguished from “not set” via `"notes" in override`. Small but correct semantic.
- **Color + dot, not color alone** for visual urgency. Color alone fails for colorblind users.
- **Caught a UTC vs local-midnight parsing bug** in `REFERENCE_NOW`. `new Date("2026-01-30")` parses as UTC midnight, which in PT renders as “January 29” — a one-day-off bug I would have shipped. Agent verified stalled count didn’t change, then fixed with the local-midnight constructor `new Date(2026, 0, 30)`. Defensive against a bug I likely wouldn’t have noticed.

#### My critical engagement

The biggest judgment call this segment was how to display dates that fall after the reference date without introducing scope creep.

The artifact: with `REFERENCE_NOW = 2026-01-30`, 90 of 620 doc rows (~14.5%) have `date_received` values in the future relative to “now.” In the detail view, this initially rendered as rows where the status said “Received” but the date said “Not yet received” — internally consistent but a verbal contradiction.

Three approaches considered:

1. **Move the reference date forward.** Pushing to ~2026-02-12 eliminates all 4 on-track applications, leaving the Stalled filter functionally equivalent to All. Worse trade-off than the artifact.
1. **Build a date picker.** Solves a development-time problem with a user-facing feature; scope creep.
1. **Show the actual date from the CSV.** Reference date is already disclosed in the header; users can interpret. Most honest rendering.

Initially shipped option 1’s mitigation, then reconsidered and switched to option 3 during documentation. The mask was creating a contradiction; removing it removes the contradiction without introducing scope.

Spot-checked the override layer by simulating a status edit on GreenLeaf Landscaping (an on-track app). Completeness and stalled status updated correctly through the data layer to the UI.

### Build segment 4: Expiring-soon view with cross-application triage

**Tool:** Claude Code · **Duration:** ~25 min

#### Prompt strategy

Mostly composition rather than new logic. Three things baked into the tight prompt:

- **Explicit data-quality consistency lock.** Docs with `Expired` status but no `expiration_date` are excluded — same rule as segment 2.
- **Pre-empted the “filter by status” mistake.** “Do not filter by current status. An Approved doc expiring in 5 days still belongs here.”
- **Sanity-check on both ends of the sort.** Top 5 *and* bottom 5 by urgency — catches sort bugs that only manifest in the middle of large lists.

#### Decisions the agent surfaced

- **Extracted `urgencyTier()` into `derived.ts`** as a shared helper (policy: when a date is urgent). Both detail and expiring-soon views import it.
- **Did NOT extract the color-class mapping** (presentation: how urgent looks). Strong distinction the agent flagged: tier function is policy, color classes are presentation. Different responsibilities, different change frequencies; not worth the indirection.
- **Extracted `selectExpiringDocs(apps, now, daysAhead)`** so the page and the list-view header count call the same function — stay-in-sync for free.

#### The product insight worth more than the feature itself

**All 7 entries in the expiring-soon view are “Bank Statements (90 day).”** Other expiration-bearing docs (tax returns, business licenses) have multi-year expirations outside the 30-day window. This isn’t a generic “documents expiring soon” list — it’s a **bank-statement-refresh triage queue**. A real loan-ops workflow concern the spreadsheet can’t catch.

The strongest argument for the view existing: **Northstar Accounting and Crown Jewelers — status “Approved,” expired in the past.** Docs the team approved, considered done, and didn’t realize had expired underneath them. The current spreadsheet workflow loses these because it tracks status, not expiration. Selection driven by `expiration_date` instead of `status` is what makes this work.

### Build segment 5: Leadership dashboard (scope adjustment, not V1)

**Tool:** Claude Code · **Duration:** ~18 min (against a hard 35-min ceiling)

> **Note on scope:** This segment is documented honestly as a scope expansion, not V1 work. The dashboard was explicitly cut in the scope doc (“different user, V2 work”). I reintroduced it after V1 was feature-complete because the underlying derived-state layer was already doing the aggregation. The weekly-email auto-generation piece stays a V2 item. See `scope-doc.md` for the “Scope adjustments during build” section.

#### Prompt strategy

Two things baked in that protected the time budget:

- **Hard ceiling: 35 minutes.** Stated explicitly: “if this crosses 35 min, stop and ship what you have.” Hard ceilings work better than soft estimates when scope is at risk.
- **No new derived helpers unless absolutely necessary.** Per-processor breakdown is a `useMemo` reduction inline in the page, not a new file. Reusing existing helpers was the difference between a 30-min build and a 60-min one.

#### Decisions the agent surfaced

- **Added `stalledDocCount: number` to `DerivedApplicationStatus`.** Computed in the existing `deriveStatus` walk. Lets the top-5 ranking sort without duplicating rule logic. Single new field, no new helper, no policy duplication.
- **Two-line stat card for stalled rate** (“56 of 60” / “93%”). The split is informative — team lead cares about absolute count for triage, rate for trend awareness.
- **Section C uses a flat list, not a table** — visually distinct from the per-processor table above. Reads as “here are five things to look at,” not “here is data to sort and filter.”

#### My critical engagement on the scope decision

The honest question: *Is adding this, after the scope doc explicitly cut it, the right call?*

My reasoning:

1. The cost was bounded — 35-min hard ceiling, actual 18 min.
1. The derived layer was already doing the aggregation; the dashboard composes existing helpers.
1. The original cut was about *the weekly auto-generated email*, which is still cut. The snapshot view is a leaner subset.
1. Documenting the expansion preserves an honest engineering trail. Git history shows: cut → built V1 → reintroduced as documented adjustment.

If any of those four had been different — if the derived layer hadn’t been there, if I’d run over the ceiling, if the original cut had been about exactly this snapshot view, or if fitting it required silently rewriting the scope doc — I would have left it cut.

#### Findings worth surfacing to the team

- **Janet Morrison is 18/18 stalled — 100%.** Per-processor view makes this visible; the spreadsheet cannot.
- **4 of the 5 most overdue applications belong to Ricardo Fuentes.** Workload imbalance, doc-mix variance, or process drift — a question the team lead wouldn’t have known to ask.
- **Maple Street Deli leads everyone at 9 stalled documents.** Specific, namable, actionable.

### Build segment 6: Data quality callout — built, then cut

**Tool:** Claude Code · **Duration:** ~25 min total (7 min initial + 10 min dropdown + 5 min reframe + 3 min revert)

> **Note on scope:** This segment documents work that was built, iterated, and then deliberately removed from the final submission before code freeze. Git history shows the full arc. The decision to cut was the most important engineering judgment moment in this segment.

#### What I was trying to surface

The 27-of-37 finding from segment 2 (Expired docs with no expiration date) left a real data-quality observation that should be visible somewhere. The instinct: surface them in the UI as a “data quality” callout so the team can see what was deliberately excluded and why.

#### What got built

**First pass (~7 min):** Static bordered callout on the list-view header. Heading “Data quality,” body text noting the 27-doc count.

**Second pass (~10 min):** Added a `<details>` disclosure to expand the list of affected docs. Native HTML, no JS state.

**Third pass (~5 min):** Realized “manual review recommended” implied the user could fix it from this UI. But `expiration_date` isn’t editable in V1. Reworded as a signal, not a to-do.

#### Why I cut it

After the reframe I recognized the implementation was a single hardcoded check (`status === 'Expired' && !expiration_date`) presented under a “Data quality” heading. The framing overpromised. A general data-quality system catches multiple kinds of issues; this one catches exactly one. The label set an expectation the code couldn’t meet.

Two paths forward: build out a real data-quality framework (way out of V1 scope), or cut the feature and surface the 27/37 finding through demo narrative instead. Option 2 wins for three reasons:

- **The engineering insight survives** — still in this log, still in the demo, still motivates the tightened stalled rule.
- **The scope story stays cleaner** — one deliberate adjustment, not two.
- **Shipping work that doesn’t earn its place clutters the product.** Cutting weak features is part of finishing them.

#### My critical engagement

This was the strongest scope-discipline moment in the build. Three things made the cut possible:

1. **Willingness to ask whether the label matched the code.** “Data quality” was aspirational; the implementation was a single check. Mid-build, the temptation is to keep the feature and rationalize the framing.
1. **The time investment was small (~22 min) and recoverable.** Sunk cost wasn’t strong enough to justify shipping a weak feature.
1. **A clear alternative existed.** The insight didn’t disappear — it moved from UI to narration. Not face-saving; the 27/37 finding still lands in the demo when explaining why the Expired rule was tightened.

The build process surfaced a real insight; the right artifact wasn’t a UI feature. Cutting is part of building.

-----

## Phase 4: Testing

**Date:** 05/19/2026
**Tool:** Claude Code
**Output:** `src/lib/derived.test.ts` (22 tests, 100% pass)
**Goal:** Cover the high-value pure-function logic with focused tests. Skip UI/component tests entirely. Treat the test file as a second piece of executable documentation for the rules.

### Prompt strategy

Reversed an earlier Phase 1 decision (skip tests) once V1 was feature-complete and I had room in the time budget. The prompt baked in three things:

- **Explicitly named what NOT to test.** UI components, CSV parsing, date-fns date math, localStorage browser integration. Each has a one-line rationale in the test file. Omissions are visible, not hidden.
- **Required boundary-pin tests on `urgencyTier`.** Day 30 → amber vs. red is a one-character difference (`<` vs `<=`). Without a pinned test, the behavior is ambiguous to anyone reading the code later. The test makes it documented.
- **Required inline fixtures.** No reading from the real CSV. Each test owns a small hand-built fixture. The test file reads as a spec, not as a fixture-wrangling exercise.

### What the agent produced

`src/lib/derived.test.ts` — 22 tests, all passing on first run in 699ms:

- **`deriveStatus` (12 tests):** happy path, three stalled triggers, two data-quality edge cases, completeness math, Under-Review dual-role, reason-string formatting.
- **`urgencyTier` (7 tests):** null handling, exact boundary pins at days 30 and 90, negative-days (expired), single-day, far-future.
- **`selectExpiringDocs` (3 tests):** cross-app sort, exclusion of docs without expiration, `daysAhead` cutoff.

### What stood out — honest framing

**Nothing failed on first run.** The agent gave it the right framing: tests don’t catch new bugs because the rules are simple enough that the implementation already matched. What they *do* catch is regression. A future change to the Expired rule that removes the `expiration_date` requirement would fail two tests immediately. The day-30 boundary is pinned. That’s the actual value.

The most expressive test is the Under-Review dual-role test. It encodes a design decision (“same data, two different questions, two different answers”) that would otherwise live only in a code comment. The test pins both the rule *and* the rationale.

### What I’d test next (V2 priority)

A round-trip integration test on the data loader (`src/lib/data.ts`). The loader is the single boundary between external data and the derived layer. Every existing test validates behavior *given* well-formed `Application[]`. If the loader silently mis-parses a column or drops a doc, every derived calculation downstream is wrong and no test catches it. Highest-blast-radius gap in current coverage.

### My critical engagement

- **Skipped writing the loader test myself** despite knowing it was the most valuable next test. Time-budget call — ~15 min needed for README and demo. Documenting it in the QA plan is the honest trade.
- **Reversed my Phase 1 decision.** Phase 1 captured my decision to skip tests in favor of feature work. After V1 was feature-complete and I’d cut a segment-6 feature, I had room. The reversal is engineering judgment under changing constraints.

-----

## Phase 5: Documentation

**Date:** 05/19/2026
**Tool:** Claude (web)
**Output:** `README.md`, `scope-doc.md` (Scope adjustments section), `ai-log.md` (this document), demo script

### Prompt strategy

By Phase 5 the AI was no longer producing decisions — it was converting decisions into structured prose. Three things made this phase efficient:

- **Context was already loaded.** Every document referenced material from earlier phases. The AI didn’t need to re-derive anything.
- **Tone and length specified up front.** “Section structure first, then prose,” “no buzzwords or generic engineering filler,” “self-assessment must name six real limitations, not three sanitized ones.”
- **Cross-document consistency was the explicit goal.** README’s QA plan, AI log’s Phase 4 entry, and demo’s testing narrative all need to say the same thing about the loader integration test being the V2 priority.

### My critical engagement

- **Trimmed self-assessment dressing.** First drafts had hedging language (“could potentially be improved by…”). I rewrote as direct statements of fact. Honest fragility is more useful than graceful hedging — a future maintainer needs to know where the weak spots are.
- **Cut the “polish” framing throughout.** AI drafts kept reaching for “polished UI” or “clean design” language. Polish doesn’t help the team using the tool — usability does.
- **Pushed back on the data quality callout dropdown.** Mid-Phase-3, the AI suggested expanding the callout into an interactive disclosure. I built it, then sat with it and realized the framing overpromised. Cut it before submission — see segment 6.
- **Owned the demo narrative explicitly.** AI suggested several phrasings for the 27/37 finding. I picked the one that frames the cut as judgment rather than face-saving.

-----

## Total time accounting

Mapped to the spec’s three-phase structure:

|Spec phase        |My phases (mapped)                                                                  |Approx. duration|
|------------------|------------------------------------------------------------------------------------|----------------|
|Understand & Build|Phase 1 (Understanding) + Phase 2 (Scoping) + Phase 3 (Building) + Phase 4 (Testing)|~3h 25m         |
|Demo It           |Demo recording                                                                      |~15 min         |
|Show Your Process |This AI log + scope-doc + README                                                    |~25 min         |
|**Total**         |                                                                                    |**~4h 5m**      |

Approximately five minutes over the 4-hour cap. The overrun lives in the build phase — specifically the data quality callout I prototyped and then cut (segment 6, ~22 min). The cut itself was the right call: shipping a half-built feature with an overpromising label was worse than the time it cost to revert. If I had that segment back, I’d use it on the loader integration test flagged as the V2 testing priority.

The time budget held closer to plan because the scope held — three V1 views, one documented adjustment (dashboard), one feature built and cut (data quality callout), and a focused test suite.
