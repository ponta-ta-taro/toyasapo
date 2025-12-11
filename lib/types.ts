export interface Email {
  id: string;
  datetime: string;
  inquiry: string;
  response: string;
  category?: string;
  priority?: number;
}
