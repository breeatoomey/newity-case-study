import { describe, it, expect } from "vitest";
import { deriveStatus, urgencyTier, selectExpiringDocs } from "./derived";
import type { Application, DocumentStatus } from "./types";

// ============================================================================
// SCOPE
// ============================================================================
// This file is the executable spec for the rules in derived.ts. Each test names
// the behavior it pins so a reader can scan it without reading the source.
//
// NOT tested here (deliberately):
//   - React components / page rendering: brittle, slow, low ROI relative to
//     the value of pinning the rules. The rules drive every UI surface — if
//     they're right and isolated, the UI is straightforward to inspect.
//   - CSV parsing: trust papaparse. We'd be re-testing a third-party library.
//   - date-fns date math: trust the library. Same reason.
//   - localStorage browser integration: requires a real browser env (jsdom or
//     Playwright). E2E territory; out of scope for a 4-hour assessment.
//
// Date handling: all inputs use ISO date strings (parsed via parseISO inside
// the implementation, yielding UTC midnight). Test `now` values are
// `new Date('YYYY-MM-DD')` which also parses as UTC midnight — so day diffs
// are exact integers regardless of the test runner's local timezone.
// ============================================================================

function makeApp(opts: {
  applicationDate?: string;
  docs: Array<{
    status: DocumentStatus;
    dateReceived?: string | null;
    expirationDate?: string | null;
    documentType?: string;
  }>;
}): Application {
  return {
    id: "APP-TEST",
    businessName: "Test Co",
    borrowerName: "Test Borrower",
    loanAmount: 100_000,
    applicationDate: opts.applicationDate ?? "2026-01-15",
    assignedProcessor: "Test Processor",
    documents: opts.docs.map((d, i) => ({
      id: `APP-TEST-doc-${i}`,
      applicationId: "APP-TEST",
      documentType: d.documentType ?? `Doc ${i + 1}`,
      status: d.status,
      dateReceived: d.dateReceived ?? null,
      expirationDate: d.expirationDate ?? null,
      notes: null,
    })),
  };
}

describe("deriveStatus", () => {
  const NOW = new Date("2026-01-30");

  it("happy path: 5-day-old app with mix of Received and Pending is not stalled", () => {
    const app = makeApp({
      applicationDate: "2026-01-25",
      docs: [
        { status: "Received" },
        { status: "Received" },
        { status: "Pending" },
        { status: "Pending" },
      ],
    });
    const d = deriveStatus(app, NOW);
    expect(d.isStalled).toBe(false);
    expect(d.stalledReasons).toEqual([]);
    expect(d.receivedCount).toBe(2);
    expect(d.pendingCount).toBe(2);
    expect(d.completeness).toBe(0.5);
  });

  it("Pending doc on a 20-day-old app trips the stalled rule (>14d threshold)", () => {
    const app = makeApp({
      applicationDate: "2026-01-10",
      docs: [{ status: "Pending" }],
    });
    const d = deriveStatus(app, NOW);
    expect(d.isStalled).toBe(true);
    expect(d.stalledReasons).toContain("1 doc pending >14d");
  });

  it("Under Review with date_received 10 days ago trips the stalled rule (>7d threshold)", () => {
    const app = makeApp({
      applicationDate: "2026-01-25", // young enough that Pending rule wouldn't trip
      docs: [{ status: "Under Review", dateReceived: "2026-01-20" }],
    });
    const d = deriveStatus(app, NOW);
    expect(d.isStalled).toBe(true);
    expect(d.stalledReasons).toContain("1 doc under review >7d");
  });

  it("Expired doc with past expiration_date trips the stalled rule", () => {
    const app = makeApp({
      applicationDate: "2026-01-25",
      docs: [{ status: "Expired", expirationDate: "2026-01-20" }],
    });
    const d = deriveStatus(app, NOW);
    expect(d.isStalled).toBe(true);
    expect(d.stalledReasons).toContain("1 expired doc");
  });

  it("Expired status with NO expiration_date is excluded (data-quality refinement)", () => {
    // Mirrors the refinement made in segment 4: Expired status without a date
    // is data-quality noise (27 of 37 such docs in the sample CSV), not
    // evidence of an actual lapsed document. Don't auto-stall on it.
    const app = makeApp({
      applicationDate: "2026-01-25",
      docs: [{ status: "Expired", expirationDate: null }],
    });
    const d = deriveStatus(app, NOW);
    expect(d.isStalled).toBe(false);
    expect(d.stalledReasons).toEqual([]);
  });

  it("Expired status with FUTURE expiration_date does not trip the stalled rule", () => {
    const app = makeApp({
      applicationDate: "2026-01-25",
      docs: [{ status: "Expired", expirationDate: "2026-02-15" }],
    });
    const d = deriveStatus(app, NOW);
    expect(d.isStalled).toBe(false);
  });

  it("all-Approved app: 100% complete, not stalled", () => {
    const app = makeApp({
      applicationDate: "2026-01-10",
      docs: [{ status: "Approved" }, { status: "Approved" }, { status: "Approved" }],
    });
    const d = deriveStatus(app, NOW);
    expect(d.isStalled).toBe(false);
    expect(d.completeness).toBe(1);
    expect(d.receivedCount).toBe(3);
    expect(d.pendingCount).toBe(0);
  });

  it("all-Not-Required app: denominator is 0, completeness falls back to 1", () => {
    const app = makeApp({
      applicationDate: "2026-01-10",
      docs: [{ status: "Not Required" }, { status: "Not Required" }],
    });
    const d = deriveStatus(app, NOW);
    expect(d.receivedCount).toBe(0);
    expect(d.pendingCount).toBe(0);
    expect(d.completeness).toBe(1);
    expect(d.isStalled).toBe(false);
  });

  it("Under Review counts as RECEIVED for completeness (design decision)", () => {
    // Same data, two different questions:
    //   - "Has the borrower delivered this?" → yes (Under Review = received)
    //   - "Is review moving forward?" → also enforced via the >7d stalled rule
    const app = makeApp({
      applicationDate: "2026-01-25", // young — no Pending stall risk
      docs: [
        { status: "Received" },
        { status: "Received" },
        { status: "Under Review", dateReceived: "2026-01-28" }, // 2d ago, not stalled
        { status: "Under Review", dateReceived: "2026-01-28" },
        { status: "Pending" },
        { status: "Pending" },
      ],
    });
    const d = deriveStatus(app, NOW);
    expect(d.receivedCount).toBe(4);
    expect(d.pendingCount).toBe(2);
    expect(d.completeness).toBeCloseTo(4 / 6, 4);
    expect(d.isStalled).toBe(false);
  });

  it("stalledReasons pluralization: singular vs plural docs", () => {
    const single = deriveStatus(
      makeApp({
        applicationDate: "2026-01-10",
        docs: [{ status: "Pending" }],
      }),
      NOW
    );
    expect(single.stalledReasons).toEqual(["1 doc pending >14d"]);

    const multiple = deriveStatus(
      makeApp({
        applicationDate: "2026-01-10",
        docs: [
          { status: "Pending" },
          { status: "Pending" },
          { status: "Pending" },
        ],
      }),
      NOW
    );
    expect(multiple.stalledReasons).toEqual(["3 docs pending >14d"]);
  });

  it("stalledReasons format: under-review and expired reasons render correctly", () => {
    const app = makeApp({
      applicationDate: "2026-01-25",
      docs: [
        { status: "Under Review", dateReceived: "2026-01-20" },
        { status: "Expired", expirationDate: "2026-01-25" },
        { status: "Expired", expirationDate: "2026-01-26" },
      ],
    });
    const d = deriveStatus(app, NOW);
    expect(d.stalledReasons).toContain("1 doc under review >7d");
    expect(d.stalledReasons).toContain("2 expired docs");
  });

  it("stalledDocCount sums all three trigger sources", () => {
    const app = makeApp({
      applicationDate: "2026-01-10", // 20d old → Pending docs trip
      docs: [
        { status: "Pending" },
        { status: "Pending" },
        { status: "Under Review", dateReceived: "2026-01-20" }, // 10d
        { status: "Expired", expirationDate: "2026-01-25" },
      ],
    });
    const d = deriveStatus(app, NOW);
    expect(d.stalledDocCount).toBe(4);
  });
});

describe("urgencyTier", () => {
  const NOW = new Date("2026-01-30");

  it('returns "none" for null expiration date', () => {
    expect(urgencyTier(null, NOW)).toBe("none");
  });

  it('91 days out → "default"', () => {
    expect(urgencyTier("2026-05-01", NOW)).toBe("default");
  });

  // Boundary pins: implementation uses `days < 30` for red, `days <= 90` for
  // amber. So exactly 30 days out is AMBER (NOT red); exactly 90 days out is
  // AMBER (NOT default). These tests fail loudly if someone retunes the
  // thresholds without realizing what the boundary behavior was.
  it('exactly 30 days out → "amber" (lower boundary)', () => {
    expect(urgencyTier("2026-03-01", NOW)).toBe("amber");
  });

  it('exactly 90 days out → "amber" (upper boundary)', () => {
    expect(urgencyTier("2026-04-30", NOW)).toBe("amber");
  });

  it('29 days out → "red"', () => {
    expect(urgencyTier("2026-02-28", NOW)).toBe("red");
  });

  it('expires today (0 days) → "red"', () => {
    expect(urgencyTier("2026-01-30", NOW)).toBe("red");
  });

  it('already expired (negative days) → "red"', () => {
    expect(urgencyTier("2026-01-20", NOW)).toBe("red");
  });
});

describe("selectExpiringDocs", () => {
  const NOW = new Date("2026-01-30");

  function makeAppWithDocs(
    id: string,
    docs: Array<{ type: string; exp: string | null }>
  ): Application {
    return {
      id,
      businessName: id,
      borrowerName: "X",
      loanAmount: 100_000,
      applicationDate: "2026-01-01",
      assignedProcessor: "P",
      documents: docs.map((d, i) => ({
        id: `${id}-doc-${i}`,
        applicationId: id,
        documentType: d.type,
        status: "Approved",
        dateReceived: "2026-01-01",
        expirationDate: d.exp,
        notes: null,
      })),
    };
  }

  it("returns docs sorted by expiration_date ascending across applications", () => {
    const apps: Application[] = [
      makeAppWithDocs("A", [
        { type: "d1", exp: "2026-01-15" }, // 15d in past
        { type: "d2", exp: null }, // excluded — no date
      ]),
      makeAppWithDocs("B", [
        { type: "d3", exp: "2026-02-10" }, // 11d future, within cutoff
        { type: "d4", exp: "2026-03-15" }, // beyond 30d cutoff
      ]),
      makeAppWithDocs("C", [
        { type: "d5", exp: "2026-02-05" }, // 6d future, within
        { type: "d6", exp: "2026-01-20" }, // 10d past
      ]),
    ];
    const result = selectExpiringDocs(apps, NOW, 30);
    expect(result.map((r) => r.doc.documentType)).toEqual([
      "d1", // 2026-01-15
      "d6", // 2026-01-20
      "d5", // 2026-02-05
      "d3", // 2026-02-10
    ]);
  });

  it("excludes docs with no expiration_date", () => {
    const apps: Application[] = [
      makeAppWithDocs("A", [
        { type: "has-date", exp: "2026-02-10" },
        { type: "no-date", exp: null },
      ]),
    ];
    const result = selectExpiringDocs(apps, NOW, 30);
    expect(result.map((r) => r.doc.documentType)).toEqual(["has-date"]);
  });

  it("respects the daysAhead cutoff", () => {
    const apps: Application[] = [
      makeAppWithDocs("A", [
        { type: "within-week", exp: "2026-02-05" }, // 6d from NOW
        { type: "within-month", exp: "2026-02-14" }, // 15d from NOW
      ]),
    ];
    const tight = selectExpiringDocs(apps, NOW, 7);
    expect(tight.map((r) => r.doc.documentType)).toEqual(["within-week"]);

    const wider = selectExpiringDocs(apps, NOW, 30);
    expect(wider.map((r) => r.doc.documentType)).toEqual([
      "within-week",
      "within-month",
    ]);
  });
});
