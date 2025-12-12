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
