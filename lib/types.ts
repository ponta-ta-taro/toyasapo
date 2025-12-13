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
}

export interface Draft {
  id: string;
  emailId: string;
  inquiry: string;
  generatedDraft: string;
  finalResponse?: string;
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
  updatedAt?: unknown;
}

export interface Template {
  id: string;
  category: string;
  pattern: string; // The specific inquiry pattern (e.g. "First visit referral")
  response: string; // The model answer
  createdAt: unknown;
}
