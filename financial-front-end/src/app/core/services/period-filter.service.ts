import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PeriodFilterService {
  // Data de referência padrão: mês atual
  public selectedDate = signal<Date>(new Date());

  // Formato YYYY-MM para filtros e buscas (ex: "2026-10")
  public selectedMonthYear = computed<string>(() => {
    const d = this.selectedDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Nome formatado para exibição amigável (ex: "Outubro de 2026")
  public formattedMonthYear = computed<string>(() => {
    const d = this.selectedDate();
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[d.getMonth()]} de ${d.getFullYear()}`;
  });

  // Nome curto para botões compactos (ex: "Out/2026")
  public shortMonthYear = computed<string>(() => {
    const d = this.selectedDate();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[d.getMonth()]}/${d.getFullYear()}`;
  });

  public isCurrentMonth = computed<boolean>(() => {
    const now = new Date();
    const d = this.selectedDate();
    return now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth();
  });

  public previousMonth(): void {
    const cur = new Date(this.selectedDate());
    cur.setMonth(cur.getMonth() - 1);
    this.selectedDate.set(cur);
  }

  public nextMonth(): void {
    const cur = new Date(this.selectedDate());
    cur.setMonth(cur.getMonth() + 1);
    this.selectedDate.set(cur);
  }

  public resetCurrentMonth(): void {
    this.selectedDate.set(new Date());
  }

  public setMonthYear(monthYearStr: string): void {
    // Formato esperado: "YYYY-MM"
    const parts = monthYearStr.split('-');
    if (parts.length === 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = new Date(y, m, 1);
      this.selectedDate.set(d);
    }
  }
}
