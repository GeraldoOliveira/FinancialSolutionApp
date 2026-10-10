import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private promptEvent: any = null;
  public canInstall = signal<boolean>(false);
  public isInstalled = signal<boolean>(false);

  constructor() {
    this.checkIfInstalled();
    this.listenToInstallPrompt();
  }

  private checkIfInstalled(): void {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
        this.isInstalled.set(true);
      }
    }
  }

  private listenToInstallPrompt(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (event: any) => {
        event.preventDefault();
        this.promptEvent = event;
        this.canInstall.set(true);
      });

      window.addEventListener('appinstalled', () => {
        this.canInstall.set(false);
        this.isInstalled.set(true);
        this.promptEvent = null;
      });
    }
  }

  public async installApp(): Promise<boolean> {
    if (!this.promptEvent) {
      return false;
    }

    this.promptEvent.prompt();
    const { outcome } = await this.promptEvent.userChoice;
    this.promptEvent = null;
    this.canInstall.set(false);

    return outcome === 'accepted';
  }
}
