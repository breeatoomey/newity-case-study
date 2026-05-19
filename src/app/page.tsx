"use client";

import { useEffect, useState } from "react";
import { loadApplications } from "@/lib/data";
import type { Application } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function docSummary(app: Application): string {
  const received = app.documents.filter(
    (d) => d.status === "Received" || d.status === "Approved" || d.status === "Under Review"
  ).length;
  const total = app.documents.length;
  return `${received} received / ${total - received} pending`;
}

export default function Home() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications()
      .then(setApplications)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

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
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-6">SBA Loan Applications</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {applications.length} applications loaded
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business Name</TableHead>
            <TableHead>Borrower</TableHead>
            <TableHead>Processor</TableHead>
            <TableHead>Loan Amount</TableHead>
            <TableHead>Application Date</TableHead>
            <TableHead>Documents</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => (
            <TableRow key={app.id}>
              <TableCell className="font-medium">{app.businessName}</TableCell>
              <TableCell>{app.borrowerName}</TableCell>
              <TableCell>{app.assignedProcessor}</TableCell>
              <TableCell>{formatCurrency(app.loanAmount)}</TableCell>
              <TableCell>{app.applicationDate}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {docSummary(app)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}
