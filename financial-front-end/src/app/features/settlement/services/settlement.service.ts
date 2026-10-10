import { Injectable } from '@angular/core';
import { Expense } from '../../../shared/models/expense-transaction';
import { Responsible } from '../../../shared/models/responsible';
import { DebtSettlement, ResponsibleBalanceSummary } from '../../../shared/models/settlement';
import { CurrencyUtils } from '../../../shared/utils/currency-utils';

@Injectable({
  providedIn: 'root'
})
export class SettlementService {

  private getStorageKey(): string {
    return 'mfs.settlements_status';
  }

  public getSettlementStatus(settlementKey: string): { settled: boolean; settledDate?: string } | null {
    try {
      const data = JSON.parse(localStorage.getItem(this.getStorageKey()) || '{}');
      return data[settlementKey] || null;
    } catch {
      return null;
    }
  }

  public saveSettlementStatus(settlementKey: string, settled: boolean, settledDate?: string): void {
    try {
      const data = JSON.parse(localStorage.getItem(this.getStorageKey()) || '{}');
      if (settled) {
        data[settlementKey] = { settled: true, settledDate: settledDate || new Date().toLocaleDateString('pt-BR') };
      } else {
        delete data[settlementKey];
      }
      localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao salvar status de acerto:', e);
    }
  }

  /**
   * Calcula o resumo de saldos e as instruções de quem deve para quem
   */
  calculateSettlement(
    expenses: Expense[],
    responsibles: Responsible[],
    targetMonthYear?: string
  ): {
    balances: ResponsibleBalanceSummary[];
    settlements: DebtSettlement[];
  } {
    const paidMap = new Map<number, number>();
    const shareMap = new Map<number, number>();

    responsibles.forEach(r => {
      paidMap.set(r.id, 0);
      shareMap.set(r.id, 0);
    });

    // Filtra por mês de referência se informado
    const filteredExpenses = targetMonthYear
      ? expenses.filter(exp => {
          if (!exp.date) return true;
          const dStr = typeof exp.date === 'string' ? exp.date : new Date(exp.date).toISOString();
          return dStr.startsWith(targetMonthYear);
        })
      : expenses;

    // Usa as despesas filtradas pelo mês de referência
    const activeExpenses = filteredExpenses;

    activeExpenses.forEach(exp => {
      const total = CurrencyUtils.StringToDecimal(exp.totalValue) || 0;
      // Considera quem pagou (ex: se userId estiver setado ou assume Neto ID 2 como default pagador do cartão)
      const payerId = exp.userId ? exp.userId : 2;
      paidMap.set(payerId, (paidMap.get(payerId) || 0) + total);

      // Cotas de rateio
      if (exp.expenseResponsibles && exp.expenseResponsibles.length > 0) {
        exp.expenseResponsibles.forEach(item => {
          const respId = item.responsibleId;
          const prorated = CurrencyUtils.StringToDecimal(item.proratedValue) || 0;
          shareMap.set(respId, (shareMap.get(respId) || 0) + prorated);
        });
      }
    });

    // Calcula saldo líquido de cada um: saldo = totalPago - totalCota
    const balances: ResponsibleBalanceSummary[] = responsibles.map(r => {
      const paid = paidMap.get(r.id) || 0;
      const share = shareMap.get(r.id) || 0;
      return {
        responsibleId: r.id,
        name: r.name,
        totalPaid: paid,
        totalShare: share,
        netBalance: Math.round((paid - share) * 100) / 100
      };
    });

    // Algoritmo de liquidação de dívidas simplificado
    const debtors = balances.filter(b => b.netBalance < -0.01).map(b => ({ ...b, balance: -b.netBalance }));
    const creditors = balances.filter(b => b.netBalance > 0.01).map(b => ({ ...b, balance: b.netBalance }));

    const settlements: DebtSettlement[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const amount = Math.min(debtor.balance, creditor.balance);

      if (amount > 0.01) {
        const monthYear = targetMonthYear || new Date().toISOString().substring(0, 7);
        const key = `${monthYear}_${debtor.responsibleId}_${creditor.responsibleId}`;
        const savedStatus = this.getSettlementStatus(key);

        settlements.push({
          fromResponsibleId: debtor.responsibleId,
          fromName: debtor.name,
          toResponsibleId: creditor.responsibleId,
          toName: creditor.name,
          amount: Math.round(amount * 100) / 100,
          monthYear,
          settled: savedStatus ? savedStatus.settled : false,
          settledDate: savedStatus?.settledDate
        });
      }

      debtor.balance -= amount;
      creditor.balance -= amount;

      if (debtor.balance <= 0.01) dIdx++;
      if (creditor.balance <= 0.01) cIdx++;
    }

    return { balances, settlements };
  }
}
