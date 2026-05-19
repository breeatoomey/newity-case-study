import { addDays, differenceInDays, parseISO } from "date-fns";
import type { Application, DerivedApplicationStatus, Document } from "@/lib/types";

// The sample CSV is a fixed snapshot from early 2026 (most recent app: 2026-01-29).
// Against `new Date()` every app trips the staleness thresholds and the Stalled
// filter collapses into the All filter. We anchor "now" to the day after the
// most recent application_date — the earliest coherent anchor — which maximizes
// the variation in the stalled signal across the dataset.
// In production with live data, replace with `new Date()`.
// Constructed via (year, monthIndex, day) so the date anchors to local midnight,
// not UTC midnight. With UTC parsing, `format(REFERENCE_NOW, "MMMM d, yyyy")`
// renders the previous day for any viewer west of UTC. Stalled counts are
// unchanged — differenceInDays measures full 24h periods.
export const REFERENCE_NOW = new Date(2026, 0, 30);

const RECEIVED_STATUSES = new Set(["Received", "Approved", "Under Review"]);
const PENDING_STATUSES = new Set(["Pending", "Expired"]);

const PENDING_STALLED_DAYS = 14;
const UNDER_REVIEW_STALLED_DAYS = 7;

function pluralizeDocs(n: number): string {
  return n === 1 ? "doc" : "docs";
}

// Note on Under Review:
// It counts as RECEIVED for the completeness gauge (the document is physically present)
// but it ALSO triggers STALLED if it's been sitting in review > 7 days.
// Same data, two different questions:
//   - "Has the borrower delivered this?" → yes
//   - "Is review moving forward?" → no
export function deriveStatus(
  app: Application,
  now: Date = new Date()
): DerivedApplicationStatus {
  let receivedCount = 0;
  let pendingCount = 0;
  let pendingStalled = 0;
  let underReviewStalled = 0;
  let expiredCount = 0;

  const appDate = parseISO(app.applicationDate);

  for (const doc of app.documents) {
    if (RECEIVED_STATUSES.has(doc.status)) receivedCount++;
    if (PENDING_STATUSES.has(doc.status)) pendingCount++;

    if (doc.status === "Pending") {
      if (differenceInDays(now, appDate) > PENDING_STALLED_DAYS) {
        pendingStalled++;
      }
    } else if (doc.status === "Under Review" && doc.dateReceived) {
      if (differenceInDays(now, parseISO(doc.dateReceived)) > UNDER_REVIEW_STALLED_DAYS) {
        underReviewStalled++;
      }
    } else if (doc.status === "Expired") {
      // Data-quality sanity check: only count Expired as a stall trigger when
      // we have evidence — an expiration_date that is actually in the past.
      // 27 of 37 Expired docs in the sample lack a date; we don't auto-trigger
      // on those (could be stale flags, mislabeled, or migration noise).
      if (doc.expirationDate && parseISO(doc.expirationDate) <= now) {
        expiredCount++;
      }
    }
  }

  const denom = receivedCount + pendingCount;
  const completeness = denom > 0 ? receivedCount / denom : 1;

  const stalledReasons: string[] = [];
  if (pendingStalled > 0) {
    stalledReasons.push(`${pendingStalled} ${pluralizeDocs(pendingStalled)} pending >14d`);
  }
  if (underReviewStalled > 0) {
    stalledReasons.push(`${underReviewStalled} ${pluralizeDocs(underReviewStalled)} under review >7d`);
  }
  if (expiredCount > 0) {
    stalledReasons.push(`${expiredCount} expired ${pluralizeDocs(expiredCount)}`);
  }

  return {
    completeness,
    receivedCount,
    pendingCount,
    isStalled: stalledReasons.length > 0,
    stalledReasons,
    stalledDocCount: pendingStalled + underReviewStalled + expiredCount,
    expiringSoonCount: 0,
  };
}

// Tier of a document's expiration urgency. Shared between the detail view (per
// doc cell) and the expiring-soon list. Tier thresholds intentionally live here
// — duplicating them in two views invites drift the next time someone tunes
// what counts as "urgent".
export type UrgencyTier = "none" | "default" | "amber" | "red";

export function urgencyTier(expirationDate: string | null, now: Date): UrgencyTier {
  if (!expirationDate) return "none";
  const days = differenceInDays(parseISO(expirationDate), now);
  if (days < 30) return "red";
  if (days <= 90) return "amber";
  return "default";
}

// Cross-application selection for the expiring-soon view. Includes any doc
// with a populated expiration_date that is on or before `now + daysAhead`.
// Already-expired docs are included (no lower bound). Status is intentionally
// ignored — an Approved doc expiring in 5 days still belongs on the list.
// Returns rows sorted by expiration_date ascending: most overdue first, then
// expiring soonest. Used by both the expiring-soon page and the list-view
// header count, so both stay in sync.
export type ExpiringEntry = { app: Application; doc: Document };

export function selectExpiringDocs(
  apps: Application[],
  now: Date = new Date(),
  daysAhead: number = 30
): ExpiringEntry[] {
  const cutoff = addDays(now, daysAhead);
  const out: ExpiringEntry[] = [];
  for (const app of apps) {
    for (const doc of app.documents) {
      if (!doc.expirationDate) continue;
      if (parseISO(doc.expirationDate) <= cutoff) {
        out.push({ app, doc });
      }
    }
  }
  return out.sort((a, b) =>
    a.doc.expirationDate!.localeCompare(b.doc.expirationDate!)
  );
}
