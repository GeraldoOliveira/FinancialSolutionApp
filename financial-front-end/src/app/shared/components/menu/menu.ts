import { Component, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { LocalStorageUtils } from '../../utils/local-storage';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

import { PwaInstallButtonComponent } from '../pwa-install-button/pwa-install-button';
import { NotificationCenterComponent } from '../notification-center/notification-center';
import { PeriodFilterService } from '../../../core/services/period-filter.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, PwaInstallButtonComponent, NotificationCenterComponent],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu implements OnInit, OnDestroy {
  public isCollapsed: boolean = true;
  public isExpenseMenuOpen = signal(false);
  public isProfileMenuOpen = signal(false);
  public isWorkspaceMenuOpen = signal(false);
  public isMobileNavOpen = signal(false);

  public token: string = "";
  public userSignal = signal<any>(null);
  public LocalStorageUtils = new LocalStorageUtils();
  private unsubscribeUser?: () => void;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.workspace-dropdown-container')) {
      this.isWorkspaceMenuOpen.set(false);
    }
    if (!target.closest('.profile-dropdown-container')) {
      this.isProfileMenuOpen.set(false);
    }
  }

  constructor(
    private router: Router,
    public periodService: PeriodFilterService,
    public workspaceService: WorkspaceService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.refreshUser();
    this.unsubscribeUser = LocalStorageUtils.userUpdatedSignal.subscribe((updated) => {
      this.userSignal.set(updated);
    });
  }

  ngOnDestroy(): void {
    if (this.unsubscribeUser) {
      this.unsubscribeUser();
    }
  }

  public refreshUser(): void {
    this.token = this.LocalStorageUtils.getUserToken() || "";
    this.userSignal.set(this.LocalStorageUtils.getUser());
  }

  get user(): any {
    return this.userSignal();
  }

  toggleExpenseMenu() {
    this.isExpenseMenuOpen.update(v => !v);
    if (this.isExpenseMenuOpen()) this.isProfileMenuOpen.set(false);
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen.update(v => !v);
    if (this.isProfileMenuOpen()) {
      this.isExpenseMenuOpen.set(false);
      this.isWorkspaceMenuOpen.set(false);
    }
  }

  toggleWorkspaceMenu() {
    this.isWorkspaceMenuOpen.update(v => !v);
    if (this.isWorkspaceMenuOpen()) {
      this.isExpenseMenuOpen.set(false);
      this.isProfileMenuOpen.set(false);
    }
  }

  selectWorkspace(workspaceId: string) {
    const ws = this.workspaceService.switchWorkspace(workspaceId);
    this.isWorkspaceMenuOpen.set(false);
    if (ws) {
      const roleBadge = ws.role === 'Admin' ? 'Administrador' : 'Visualizador (Leitura)';
      this.toastr.info(`Workspace: ${ws.name} (${roleBadge})`, 'Contexto Alternado', {
        timeOut: 2500,
        progressBar: true
      });
      // Recarrega página atual para atualizar dados com novo header de workspace
      window.location.reload();
    }
  }

  toggleMobileNav() {
    this.isMobileNavOpen.update(v => !v);
  }

  closeMenus() {
    this.isExpenseMenuOpen.set(false);
    this.isProfileMenuOpen.set(false);
    this.isWorkspaceMenuOpen.set(false);
    this.isMobileNavOpen.set(false);
  }

  userLogged(): boolean {
    const token = this.LocalStorageUtils.getUserToken();
    return token !== null && token !== '';
  }

  logout() {
    this.LocalStorageUtils.clearLocalUser();
    this.userSignal.set(null);
  }
}
