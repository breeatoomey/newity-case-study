import { differenceInDays, parseISO } from "date-fns";
import type { Application, DerivedApplicationStatus } from "@/lib/types";

// The sample CSV is a fixed snapshot from early 2026 (most recent app: 2026-01-29).
// Against `new Date()` every app trips the staleness thresholds and the Stalled
// filter collapses into the All filter. We anchor "now" to the day after the
// most recent application_date — the earliest coherent anchor — which maximizes
// the variation in the stalled signal across the dataset.
// In production with live data, replace with `new Date()`.
export const REFERENCE_NOW = new Date("2026-01-30");

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
    expiringSoonCount: 0,
  };
}
