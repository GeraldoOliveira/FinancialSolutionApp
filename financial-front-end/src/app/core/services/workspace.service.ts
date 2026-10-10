import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Workspace, WorkspaceRole, ExternalDebt } from '../../shared/models/workspace';
import { environment } from '../../../environments/environment';
import { LocalStorageUtils } from '../../shared/utils/local-storage';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private readonly apiUrl = environment.apiUrlv1;
  private readonly localStorage = new LocalStorageUtils();
  private readonly ACTIVE_WS_KEY = 'mfs.active_workspace_id';

  // Signals
  public workspaces = signal<Workspace[]>([]);
  public activeWorkspace = signal<Workspace | null>(null);
  public externalDebts = signal<ExternalDebt[]>([]);

  // Computed state
  public currentRole = computed<WorkspaceRole>(() => this.activeWorkspace()?.role || 'Admin');
  public isAdmin = computed<boolean>(() => this.currentRole() === 'Admin');
  public isViewer = computed<boolean>(() => this.currentRole() === 'Viewer');
  public isOwner = computed<boolean>(() => !!this.activeWorkspace()?.isOwner);

  public pendingExternalDebtsCount = computed<number>(() => 
    this.externalDebts().filter(d => d.status === 'PENDING').length
  );

  constructor(private http: HttpClient) {
    // Carregar workspaces se usuário já estiver logado
    if (this.localStorage.getUserToken()) {
      this.loadUserWorkspaces().subscribe();
      this.loadExternalDebts().subscribe();
    }

    // Ouvir logout/login
    LocalStorageUtils.userUpdatedSignal.subscribe((user) => {
      if (user) {
        this.loadUserWorkspaces().subscribe();
        this.loadExternalDebts().subscribe();
      } else {
        this.workspaces.set([]);
        this.activeWorkspace.set(null);
        this.externalDebts.set([]);
        localStorage.removeItem(this.ACTIVE_WS_KEY);
      }
    });
  }

  /**
   * Carrega todos os Workspaces aos quais o usuário tem acesso (seja como Admin ou Viewer)
   */
  public loadUserWorkspaces(): Observable<Workspace[]> {
    const user = this.localStorage.getUser() || {};
    const userId = user.id || 1;
    const email = user.email || 'gevo.neto@hotmail.com';
    const phone = user.phone || '5511999990002';

    const url = `${this.apiUrl}user-workspaces?userId=${userId}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`;
    return this.http.get<Workspace[]>(url).pipe(
      tap((list) => {
        const validList = Array.isArray(list) ? list : [];
        this.workspaces.set(validList);

        const savedWsId = localStorage.getItem(this.ACTIVE_WS_KEY);
        let selected = validList.find(w => w.id === savedWsId);

        if (!selected && validList.length > 0) {
          // Seleciona workspace próprio (Admin) por padrão se existir
          selected = validList.find(w => w.isOwner) || validList[0];
        }

        if (selected) {
          this.setActiveWorkspace(selected);
        }
      })
    );
  }

  /**
   * Altera o workspace ativo de trabalho
   */
  public switchWorkspace(workspaceId: string): Workspace | undefined {
    const target = this.workspaces().find(w => w.id === workspaceId);
    if (target) {
      this.setActiveWorkspace(target);
    }
    return target;
  }

  private setActiveWorkspace(ws: Workspace): void {
    this.activeWorkspace.set(ws);
    localStorage.setItem(this.ACTIVE_WS_KEY, ws.id);
  }

  /**
   * Carrega débitos em aberto em workspaces de terceiros ("Contas a Pagar a Terceiros")
   */
  public loadExternalDebts(): Observable<ExternalDebt[]> {
    const user = this.localStorage.getUser() || {};
    const email = user.email || 'gevo.neto@hotmail.com';
    const phone = user.phone || '5511999990002';

    const url = `${this.apiUrl}external-debts?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`;
    return this.http.get<ExternalDebt[]>(url).pipe(
      tap((debts) => {
        this.externalDebts.set(Array.isArray(debts) ? debts : []);
      })
    );
  }

  /**
   * Marca débito como pago / informa reembolso realizado
   */
  public payExternalDebt(debtId: number): Observable<any> {
    const url = `${this.apiUrl}workspaces/external-debts/${debtId}/pay`;
    return this.http.post(url, {}).pipe(
      tap(() => {
        this.externalDebts.update(debts => 
          debts.map(d => d.id === debtId ? { ...d, status: 'PAID', paidAt: new Date().toISOString() } : d)
        );
      })
    );
  }

  /**
   * Login simulado via OAuth Google com auto-criação de Workspace Pessoal e vínculo por Telefone/Email
   */
  public loginWithGoogle(email: string, name?: string, phone?: string, photoUrl?: string): Observable<any> {
    const url = `${this.apiUrl}auth/google`;
    return this.http.post<any>(url, { email, name, phone, photoUrl }).pipe(
      tap((res) => {
        if (res && res.user) {
          this.localStorage.saveLocalUser(res);
          if (res.workspaces && Array.isArray(res.workspaces)) {
            this.workspaces.set(res.workspaces);
            const active = res.activeWorkspace || res.workspaces[0];
            if (active) {
              this.setActiveWorkspace(active);
            }
          }
          this.loadExternalDebts().subscribe();
        }
      })
    );
  }
}
