import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-install-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (pwaService.canInstall() && !pwaService.isInstalled()) {
      <button 
        type="button" 
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 text-xs sm:text-sm font-medium transition-all animate-pulse cursor-pointer"
        (click)="install()"
        title="Instalar FinancialApp no seu dispositivo">
        <i class="fas fa-download"></i>
        <span class="hidden sm:inline">Instalar App</span>
      </button>
    }
  `,
  styles: [`
    .animate-pulse {
      animation: pulse-glow 2s infinite;
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(13, 202, 240, 0.4); }
      50% { box-shadow: 0 0 10px 3px rgba(13, 202, 240, 0.6); }
    }
  `]
})
export class PwaInstallButtonComponent {
  public pwaService = inject(PwaService);

  async install(): Promise<void> {
    await this.pwaService.installApp();
  }
}
