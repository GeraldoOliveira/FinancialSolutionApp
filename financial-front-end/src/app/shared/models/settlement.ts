export interface DebtSettlement {
  fromResponsibleId: number;
  fromName: string;
  toResponsibleId: number;
  toName: string;
  amount: number;
  monthYear: string;
  settled: boolean;
  settledDate?: string;
  proofUrl?: string;
}

export interface ResponsibleBalanceSummary {
  responsibleId: number;
  name: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number;
}
