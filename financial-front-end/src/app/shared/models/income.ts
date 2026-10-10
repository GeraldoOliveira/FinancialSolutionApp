export interface Income {
  id?: number;
  description: string;
  source: string;
  amount: number;
  date: string;
  recipientId: number;
  received: boolean;
  notes?: string;
}
