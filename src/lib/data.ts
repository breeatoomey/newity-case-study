import Papa from "papaparse";
import type { Application, Document, DocumentStatus } from "@/lib/types";
import { getOverrides } from "@/lib/storage";

type CsvRow = {
  application_id: string;
  business_name: string;
  borrower_name: string;
  loan_amount: string;
  application_date: string;
  assigned_processor: string;
  document_type: string;
  document_status: string;
  date_received: string;
  expiration_date: string;
  notes: string;
};

export async function loadApplications(): Promise<Application[]> {
  const response = await fetch("/sample_data.csv");
  const text = await response.text();

  const { data } = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const overrides = getOverrides();
  const appMap = new Map<string, Application>();

  for (const row of data) {
    const appId = row.application_id;

    if (!appMap.has(appId)) {
      appMap.set(appId, {
        id: appId,
        businessName: row.business_name,
        borrowerName: row.borrower_name,
        loanAmount: parseFloat(row.loan_amount),
        applicationDate: row.application_date,
        assignedProcessor: row.assigned_processor,
        documents: [],
      });
    }

    const docId = `${appId}-${row.document_type}`;
    const override = overrides[docId];

    const doc: Document = {
      id: docId,
      applicationId: appId,
      documentType: row.document_type,
      status: (override?.status ?? row.document_status) as DocumentStatus,
      dateReceived: row.date_received || null,
      expirationDate: row.expiration_date || null,
      // override.notes can be null (explicit clear) — use `in` check to distinguish from absent
      notes: override && "notes" in override ? (override.notes ?? null) : (row.notes || null),
    };

    appMap.get(appId)!.documents.push(doc);
  }

  return Array.from(appMap.values());
}
