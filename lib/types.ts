export interface Classification {
  category: string;
  priority: number;
  reason: string;
}

export interface Email {
  id: string;
  datetime: string;
  inquiry: string;
  response: string;
  classification?: Classification;
  source?: 'csv' | 'manual' | 'gmail';
  isProcessed?: boolean; // True if replied or manually marked
  isDeleted?: boolean;
  deletedAt?: unknown;
}

export interface Draft {
  id: string;
  emailId: string;
  inquiry: string;
  generatedDraft: string;
  finalResponse?: string;
  notes?: string[];
  isApproved: boolean;
  createdAt: unknown;
}

export interface PolicyHistory {
  id: string;
  content: string;
  version: number;
  createdAt: unknown;
}

export interface ClinicSettings {
  policy: string;
  signature: string;
  reservationUrl: string;
  clinicHours: string;
  phoneNumber: string;
  commonInfo: string;
  templateCategories?: string[];
  updatedAt?: unknown;
}

export interface Template {
  id: string;
  category: string;
  pattern: string; // The specific inquiry pattern (e.g. "First visit referral")
  response: string; // The model answer
  source?: 'manual' | 'learning_data';
  createdAt: unknown;
}

export interface GmailImport {
  id: string;
  subject: string;
  body: string;
  receivedAt: unknown;
  from: string;
  isProcessed: boolean;
}
