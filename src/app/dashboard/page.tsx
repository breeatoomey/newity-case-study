"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { loadApplications } from "@/lib/data";
import {
  REFERENCE_NOW,
  deriveStatus,
  selectExpiringDocs,
} from "@/lib/derived";
import type { Application, DerivedApplicationStatus } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = { app: Application; derived: DerivedApplicationStatus };
type ProcRow = {
  processor: string;
  total: number;
  stalled: number;
  onTrack: number;
  rate: number;
};

function formatPipelineValue(total: number): string {
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `$${Math.round(total / 1_000)}K`;
  return `$${total}`;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="border rounded-md p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-2 tabular-nums">{value}</div>
      {sub && (
        <div className="text-xs text-muted-foreground mt-1 tabular-nums">{sub}</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications()
      .then(setApps)
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo<Row[]>(
    () => apps.map((app) => ({ app, derived: deriveStatus(app, REFERENCE_NOW) })),
    [apps]
  );

  const stalledCount = useMemo(
    () => rows.filter((r) => r.derived.isStalled).length,
    [rows]
  );

  const totalPipeline = useMemo(
    () => apps.reduce((sum, a) => sum + a.loanAmount, 0),
    [apps]
  );

  const expiringCount = useMemo(
    () => selectExpiringDocs(apps, REFERENCE_NOW, 30).length,
    [apps]
  );

  const procStats = useMemo<ProcRow[]>(() => {
    const map = new Map<string, { total: number; stalled: number }>();
    for (const { app, derived } of rows) {
      const cur = map.get(app.assignedProcessor) ?? { total: 0, stalled: 0 };
      cur.total++;
      if (derived.isStalled) cur.stalled++;
      map.set(app.assignedProcessor, cur);
    }
    return Array.from(map.entries())
      .map(([processor, { total, stalled }]) => ({
        processor,
        total,
        stalled,
        onTrack: total - stalled,
        rate: total > 0 ? stalled / total : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [rows]);

  const topOverdue = useMemo<Row[]>(
    () =>
      rows
        .filter((r) => r.derived.isStalled)
        .sort((a, b) => b.derived.stalledDocCount - a.derived.stalledDocCount)
        .slice(0, 5),
    [rows]
  );

  if (loading) {
    return (
      <main className="p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const stalledRatePct =
    apps.length > 0 ? Math.round((stalledCount / apps.length) * 100) : 0;

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to all applications
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Snapshot as of {format(REFERENCE_NOW, "MMMM d, yyyy")}
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Active applications" value={apps.length} />
        <StatCard
          label="Pipeline value"
          value={formatPipelineValue(totalPipeline)}
        />
        <StatCard
          label="Stalled rate"
          value={`${stalledCount} of ${apps.length}`}
          sub={`${stalledRatePct}%`}
        />
        <StatCard label="Expiring in 30 days" value={expiringCount} />
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Per-processor workload</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Processor</TableHead>
              <TableHead className="text-right">Total apps</TableHead>
              <TableHead className="text-right">Stalled</TableHead>
              <TableHead className="text-right">On track</TableHead>
              <TableHead className="text-right">Stalled rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {procStats.map((p) => (
              <TableRow key={p.processor}>
                <TableCell className="font-medium">{p.processor}</TableCell>
                <TableCell className="text-right tabular-nums">{p.total}</TableCell>
                <TableCell className="text-right tabular-nums text-destructive">
                  {p.stalled}
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.onTrack}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {Math.round(p.rate * 100)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Top 5 most overdue applications</h2>
        {topOverdue.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No stalled applications.
          </p>
        ) : (
          <ul className="divide-y border rounded-md">
            {topOverdue.map(({ app, derived }) => (
              <li key={app.id} className="p-4 flex justify-between items-start gap-4">
                <div>
                  <Link
                    href={`/applications/${app.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {app.businessName}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1">
                    {app.assignedProcessor} · applied {app.applicationDate}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {derived.stalledReasons.join(" · ")}
                  </div>
                </div>
                <div className="text-sm tabular-nums whitespace-nowrap">
                  {derived.stalledDocCount} stalled {derived.stalledDocCount === 1 ? "doc" : "docs"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
