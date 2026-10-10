export interface RecurringExpense {
  id: number | string;
  title: string;
  category: string;
  amount: number;
  dueDay: number; // Dia de cobrança no mês (1-31)
  paymentMethod: string; // '1' para Cartão de Crédito, '2' para Pix / À vista, etc.
  creditCardId?: number;
  active: boolean;
  
  // Tipo de Rateio: Fixo ou Alternado / Rodízio
  splitType?: 'FIXED' | 'ROTATING';
  
  // Rateio Fixo (cota de cada pessoa todo mês)
  responsiblesSplit: {
    responsibleId: number;
    proratedValue: number;
  }[];

  // Rateio Alternado / Rodízio Mensal
  rotationOrder?: number[]; // Fila ordenada de IDs de responsáveis (ex: [2, 1, 3] -> Neto, Anelise, Yah)
  rotationStartMonth?: string; // Mês inicial de referência do rodízio (ex: '2026-10')

  lastProcessedMonth?: string; // Ex: '2026-10'
  notes?: string;
}
