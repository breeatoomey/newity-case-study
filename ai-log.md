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
#### What I'm doing before the next session
 
1. Browser-verify the table renders 60 rows correctly
2. Export Claude Code session log to `ai-evidence/`
3. Commit the scaffold
4. Take a short break before the highest-leverage build session
 
---
 
## Phase 4: Testing
 
*QA plan and testing decisions.*
 
---
 
## Phase 5: Documentation
 
*README, self-assessment, and demo narrative.*