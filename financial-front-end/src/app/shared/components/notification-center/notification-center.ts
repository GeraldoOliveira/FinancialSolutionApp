import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FinancialNotification {
  id: number;
  title: string;
  description: string;
  date: string;
  type: 'warning' | 'info' | 'danger';
  read: boolean;
}

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative" (click)="$event.stopPropagation()">
      <button 
        type="button" 
        (click)="toggleOpen()"
        class="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white flex items-center justify-center transition-all relative cursor-pointer"
        title="Central de Notificações">
        <i class="fas fa-bell text-sm"></i>
        @if (unreadCount() > 0) {
          <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-[10px] shadow">
            {{ unreadCount() }}
          </span>
        }
      </button>

      @if (isOpen()) {
        <div class="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-800 border border-slate-700/70 shadow-2xl p-0 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          <div class="p-3.5 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/40">
            <h6 class="font-bold text-white mb-0 text-sm flex items-center gap-2">
              <i class="fas fa-bell text-indigo-400 text-xs"></i>
              <span>Notificações</span>
            </h6>
            <span class="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold">
              {{ notifications().length }} alertas
            </span>
          </div>

          <div class="max-h-80 overflow-y-auto divide-y divide-slate-700/30">
            @for (notif of notifications(); track notif.id) {
              <div class="p-3.5 flex gap-3 items-start hover:bg-slate-700/30 transition-colors">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" [ngClass]="{
                  'bg-amber-500/20 text-amber-400 border border-amber-500/30': notif.type === 'warning',
                  'bg-sky-500/20 text-sky-400 border border-sky-500/30': notif.type === 'info',
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30': notif.type === 'danger'
                }">
                  <i class="fas text-xs" [ngClass]="{
                    'fa-exclamation-triangle': notif.type === 'warning',
                    'fa-info-circle': notif.type === 'info',
                    'fa-bell': notif.type === 'danger'
                  }"></i>
                </div>
                <div class="flex-grow min-w-0">
                  <div class="font-semibold text-white text-xs">{{ notif.title }}</div>
                  <div class="text-slate-400 text-xs leading-snug mt-0.5">{{ notif.description }}</div>
                  <div class="text-slate-500 text-[10px] mt-1">{{ notif.date }}</div>
                </div>
              </div>
            }
          </div>

          <div class="p-2.5 text-center border-t border-slate-700/50 bg-slate-900/40">
            <button type="button" 
              class="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer" 
              (click)="markAllAsRead()">
              Marcar todas como lidas
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class NotificationCenterComponent {
  public isOpen = signal<boolean>(false);

  public notifications = signal<FinancialNotification[]>([
    {
      id: 1,
      title: 'Fatura Próxima do Fechamento',
      description: 'A fatura do Nubank fecha amanhã. Total atual: R$ 2.840,50.',
      date: '09/10/2026 09:15',
      type: 'warning',
      read: false
    },
    {
      id: 2,
      title: 'Limite de Orçamento',
      description: 'A categoria Viagem atingiu 97% do limite mensal estipulado.',
      date: '08/10/2026 18:30',
      type: 'danger',
      read: false
    },
    {
      id: 3,
      title: 'Rateio de Despesa Registrado',
      description: 'Nova despesa de Supermercado dividida entre Neto e Anelise.',
      date: '08/10/2026 14:00',
      type: 'info',
      read: true
    }
  ]);

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
    }
  }

  toggleOpen(): void {
    this.isOpen.update(v => !v);
  }

  unreadCount(): number {
    return this.notifications().filter(n => !n.read).length;
  }

  markAllAsRead(): void {
    this.notifications.update(items => items.map(i => ({ ...i, read: true })));
  }
}
