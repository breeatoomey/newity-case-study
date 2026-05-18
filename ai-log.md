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
 
*To be filled in once the scope doc is finalized.*
 
---
 
## Phase 3: Building
 
*Capturing key Claude Code sessions, prompts, and decisions during the build.*
 
---
 
## Phase 4: Testing
 
*QA plan and testing decisions.*
 
---
 
## Phase 5: Documentation
 
*README, self-assessment, and demo narrative.*