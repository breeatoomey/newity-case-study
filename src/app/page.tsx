"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { loadApplications } from "@/lib/data";
import { deriveStatus, REFERENCE_NOW, selectExpiringDocs } from "@/lib/derived";
import type { Application, DerivedApplicationStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StalledFilter = "all" | "stalled";
type ProcessorFilter = "all" | string;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

type Row = { app: Application; derived: DerivedApplicationStatus };

export default function Home() {
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stalledFilter, setStalledFilter] = useState<StalledFilter>("all");
  const [processorFilter, setProcessorFilter] = useState<ProcessorFilter>("all");

  useEffect(() => {
    loadApplications()
      .then(setApps)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo<Row[]>(
    () => apps.map((app) => ({ app, derived: deriveStatus(app, REFERENCE_NOW) })),
    [apps]
  );

  const processors = useMemo(
    () => Array.from(new Set(apps.map((a) => a.assignedProcessor))).sort(),
    [apps]
  );

  const stalledCount = useMemo(
    () => rows.filter((r) => r.derived.isStalled).length,
    [rows]
  );

  const expiringCount = useMemo(
    () => selectExpiringDocs(apps, REFERENCE_NOW, 30).length,
    [apps]
  );


  const visibleRows = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (stalledFilter === "stalled" && !r.derived.isStalled) return false;
      if (processorFilter !== "all" && r.app.assignedProcessor !== processorFilter) {
        return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (a.derived.isStalled !== b.derived.isStalled) {
        return a.derived.isStalled ? -1 : 1;
      }
      return b.app.applicationDate.localeCompare(a.app.applicationDate);
    });
  }, [rows, stalledFilter, processorFilter]);

  if (loading) {
    return (
      <main className="p-8">
        <p className="text-sm text-muted-foreground">Loading applications…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-8">
        <p className="text-sm text-destructive">Failed to load data: {error}</p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">SBA Document Checklist</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {apps.length} applications ·{" "}
              <span className="text-destructive font-medium">{stalledCount} stalled</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Reference date: {format(REFERENCE_NOW, "MMMM d, yyyy")} (sample data is a snapshot)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "outline" })}
            >
              Dashboard
            </Link>
            <Link
              href="/expiring-soon"
              className={buttonVariants({ variant: "outline" })}
            >
              Expiring soon ({expiringCount})
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          variant={stalledFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStalledFilter("all")}
        >
          All
        </Button>
        <Button
          variant={stalledFilter === "stalled" ? "default" : "outline"}
          size="sm"
          onClick={() => setStalledFilter("stalled")}
        >
          Stalled only
        </Button>
        <div className="h-5 border-l mx-2" />
        <Button
          variant={processorFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setProcessorFilter("all")}
        >
          All processors
        </Button>
        {processors.map((p) => (
          <Button
            key={p}
            variant={processorFilter === p ? "default" : "outline"}
            size="sm"
            onClick={() => setProcessorFilter(p)}
          >
            {p}
          </Button>
        ))}
      </div>

      {visibleRows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center border rounded-md">
          No applications match these filters
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead>Processor</TableHead>
              <TableHead className="text-right">Loan Amount</TableHead>
              <TableHead>App Date</TableHead>
              <TableHead className="w-[220px]">Completeness</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map(({ app, derived }) => {
              const total = derived.receivedCount + derived.pendingCount;
              const pct = Math.round(derived.completeness * 100);
              return (
                <TableRow
                  key={app.id}
                  onClick={() => router.push(`/applications/${app.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{app.businessName}</TableCell>
                  <TableCell>{app.borrowerName}</TableCell>
                  <TableCell>{app.assignedProcessor}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(app.loanAmount)}
                  </TableCell>
                  <TableCell className="tabular-nums">{app.applicationDate}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular-nums whitespace-nowrap">
                        {derived.receivedCount}/{total}
                        <span className="text-muted-foreground ml-1">— {pct}%</span>
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
                        <div
                          className={
                            "h-full rounded-full " +
                            (pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500")
                          }
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {derived.isStalled ? (
                      <div>
                        <Badge variant="destructive">Stalled</Badge>
                        <div className="text-xs text-muted-foreground mt-1 leading-tight">
                          {derived.stalledReasons.join(" · ")}
                        </div>
                      </div>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                      >
                        On track
                      </Badge>
                    )}
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
