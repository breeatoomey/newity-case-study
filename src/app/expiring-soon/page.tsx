"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { differenceInDays, parseISO } from "date-fns";
import { loadApplications } from "@/lib/data";
import {
  REFERENCE_NOW,
  selectExpiringDocs,
  urgencyTier,
  type ExpiringEntry,
} from "@/lib/derived";
import type { Application, DocumentStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<
  DocumentStatus,
  "destructive" | "secondary" | "outline"
> = {
  Pending: "destructive",
  Expired: "destructive",
  Received: "secondary",
  "Under Review": "secondary",
  Approved: "secondary",
  "Not Required": "outline",
};

function formatRelative(expirationDate: string, now: Date): string {
  const days = differenceInDays(parseISO(expirationDate), now);
  if (days < 0) return `Expired ${Math.abs(days)} days ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires in 1 day";
  return `Expires in ${days} days`;
}

export default function ExpiringSoon() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications()
      .then(setApps)
      .finally(() => setLoading(false));
  }, []);

  const entries = useMemo<ExpiringEntry[]>(
    () => selectExpiringDocs(apps, REFERENCE_NOW, 30),
    [apps]
  );

  const { expired, upcoming } = useMemo(() => {
    let expired = 0;
    let upcoming = 0;
    for (const { doc } of entries) {
      const days = differenceInDays(parseISO(doc.expirationDate!), REFERENCE_NOW);
      if (days < 0) expired++;
      else upcoming++;
    }
    return { expired, upcoming };
  }, [entries]);

  if (loading) {
    return (
      <main className="p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to all applications
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Expiring soon</h1>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="text-destructive font-medium">{expired} expired</span> ·{" "}
          {upcoming} expiring in next 30 days
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center border rounded-md">
          Nothing expiring in the next 30 days.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(({ app, doc }) => {
              const tier = urgencyTier(doc.expirationDate, REFERENCE_NOW);
              const dotClass =
                tier === "red"
                  ? "bg-rose-500"
                  : tier === "amber"
                  ? "bg-amber-500"
                  : "";
              const textClass =
                tier === "red"
                  ? "text-rose-600 dark:text-rose-400"
                  : tier === "amber"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground";

              return (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/applications/${app.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {app.businessName}
                    </Link>
                  </TableCell>
                  <TableCell>{doc.documentType}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[doc.status]}>{doc.status}</Badge>
                  </TableCell>
                  <TableCell className={`tabular-nums ${textClass}`}>
                    <span className="inline-flex items-center gap-2">
                      {dotClass && (
                        <span className={`inline-block size-2 rounded-full ${dotClass}`} />
                      )}
                      <span>{doc.expirationDate}</span>
                      <span className="text-xs">— {formatRelative(doc.expirationDate!, REFERENCE_NOW)}</span>
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
