export interface CreditCard {
  id?: number;
  name: string;
  bank: string;
  lastDigits: string;
  color: string;
  totalLimit: number;
  availableLimit: number;
  closingDay: number;
  dueDay: number;
  paymentDays?: number;
}

export interface CreditCardInvoice {
  id?: number;
  cardId: number;
  monthYear: string;
  closingDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'ABERTA' | 'FECHADA' | 'PAGA';
  responsibleTotals: {
    responsibleId: number;
    amount: number;
  }[];
}
