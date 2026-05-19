export type DocumentStatus =
  | "Pending"
  | "Received"
  | "Under Review"
  | "Approved"
  | "Expired"
  | "Not Required";

export type Document = {
  id: string;
  applicationId: string;
  documentType: string;
  status: DocumentStatus;
  dateReceived: string | null;
  expirationDate: string | null;
  notes: string | null;
};

export type Application = {
  id: string;
  businessName: string;
  borrowerName: string;
  loanAmount: number;
  applicationDate: string;
  assignedProcessor: string;
  documents: Document[];
};

export type DerivedApplicationStatus = {
  completeness: number;
  receivedCount: number;
  pendingCount: number;
  isStalled: boolean;
  stalledReasons: string[];
  stalledDocCount: number;
  expiringSoonCount: number;
};
