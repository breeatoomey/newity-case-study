"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { differenceInDays, parseISO } from "date-fns";
import { loadApplications } from "@/lib/data";
import { deriveStatus, REFERENCE_NOW } from "@/lib/derived";
import { setDocOverride } from "@/lib/storage";
import type { Application, Document, DocumentStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_OPTIONS: DocumentStatus[] = [
  "Pending",
  "Received",
  "Under Review",
  "Approved",
  "Expired",
  "Not Required",
];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type UrgencyTier = "none" | "default" | "amber" | "red";

function urgencyTier(expirationDate: string | null, now: Date): UrgencyTier {
  if (!expirationDate) return "none";
  const days = differenceInDays(parseISO(expirationDate), now);
  if (days < 30) return "red";
  if (days <= 90) return "amber";
  return "default";
}

function formatExpiration(expirationDate: string | null, now: Date): string {
  if (!expirationDate) return "—";
  const days = differenceInDays(parseISO(expirationDate), now);
  if (days < 0) return `${expirationDate} (expired ${Math.abs(days)} days ago)`;
  if (days === 0) return `${expirationDate} (expires today)`;
  return `${expirationDate} (${days} days)`;
}

function formatDateReceived(dateReceived: string | null, now: Date): string {
  if (!dateReceived) return "—";
  if (differenceInDays(parseISO(dateReceived), now) > 0) return "Not yet received";
  return dateReceived;
}

export default function ApplicationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications()
      .then((apps) => setApp(apps.find((a) => a.id === id) ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  const derived = useMemo(
    () => (app ? deriveStatus(app, REFERENCE_NOW) : null),
    [app]
  );

  function updateDoc(
    docId: string,
    partial: { status?: DocumentStatus; notes?: string | null }
  ) {
    setApp((prev) => {
      if (!prev) return prev;
      const newDocs = prev.documents.map((d) =>
        d.id === docId ? { ...d, ...partial } : d
      );
      return { ...prev, documents: newDocs };
    });
    setDocOverride(docId, partial);
  }

  if (loading) {
    return (
      <main className="p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!app || !derived) {
    return (
      <main className="p-8 max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to all applications
        </Link>
        <h1 className="text-2xl font-semibold mt-4">Application not found</h1>
        <p className="text-sm text-muted-foreground mt-2">
          No application with ID <code className="text-xs">{id}</code>.
        </p>
      </main>
    );
  }

  const total = derived.receivedCount + derived.pendingCount;
  const pct = Math.round(derived.completeness * 100);

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to all applications
      </Link>

      <header className="flex flex-wrap justify-between items-start gap-4 mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{app.businessName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {app.borrowerName} · {app.assignedProcessor} · applied{" "}
            {app.applicationDate} · {formatCurrency(app.loanAmount)}
          </p>
        </div>
        <div className="text-right">
          {derived.isStalled ? (
            <>
              <Badge variant="destructive">Stalled</Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {derived.stalledReasons.join(" · ")}
              </div>
            </>
          ) : (
            <Badge
              variant="secondary"
              className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              On track
            </Badge>
          )}
          <div className="text-xs text-muted-foreground mt-2 tabular-nums">
            {derived.receivedCount}/{total} complete ({pct}%)
          </div>
        </div>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead className="w-[180px]">Status</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead className="w-[280px]">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {app.documents.map((doc) => (
            <DocRow key={doc.id} doc={doc} onChange={updateDoc} />
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

function DocRow({
  doc,
  onChange,
}: {
  doc: Document;
  onChange: (
    id: string,
    partial: { status?: DocumentStatus; notes?: string | null }
  ) => void;
}) {
  const [notes, setNotes] = useState(doc.notes ?? "");

  useEffect(() => {
    setNotes(doc.notes ?? "");
  }, [doc.notes]);

  const tier = urgencyTier(doc.expirationDate, REFERENCE_NOW);
  const tierClass =
    tier === "red"
      ? "text-rose-600 dark:text-rose-400"
      : tier === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground";
  const dotClass =
    tier === "red"
      ? "bg-rose-500"
      : tier === "amber"
      ? "bg-amber-500"
      : tier === "default"
      ? "bg-emerald-500"
      : "";

  return (
    <TableRow>
      <TableCell className="font-medium align-middle">{doc.documentType}</TableCell>
      <TableCell className="align-middle">
        <Select
          value={doc.status}
          onValueChange={(v) => onChange(doc.id, { status: v as DocumentStatus })}
        >
          <SelectTrigger size="sm" className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="tabular-nums align-middle text-muted-foreground">
        {formatDateReceived(doc.dateReceived, REFERENCE_NOW)}
      </TableCell>
      <TableCell className={`tabular-nums align-middle ${tierClass}`}>
        <span className="inline-flex items-center gap-2">
          {dotClass && <span className={`inline-block size-2 rounded-full ${dotClass}`} />}
          {formatExpiration(doc.expirationDate, REFERENCE_NOW)}
        </span>
      </TableCell>
      <TableCell className="align-middle">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            const next = notes.trim() || null;
            const prev = doc.notes ?? null;
            if (next !== prev) {
              onChange(doc.id, { notes: next });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          placeholder="—"
          className="h-8"
        />
      </TableCell>
    </TableRow>
  );
}
