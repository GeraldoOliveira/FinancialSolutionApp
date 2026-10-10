export interface Budget {
  id?: number;
  category: string;
  monthlyLimit: number;
  currentSpent: number;
  monthYear: string;
  alertThresholdPercent?: number;
}
