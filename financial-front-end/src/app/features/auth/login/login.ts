import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ChangeDetectorRef, Component, DestroyRef, ElementRef, ViewChildren, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormControl, FormControlName, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { CustomValidators } from '../../../shared/utils/custom-validators';
import { fromEvent, merge, Observable } from 'rxjs';

import { ToastrService } from 'ngx-toastr';

import { DisplayMessage, GenericValidator, ValidationMessages } from '../../../shared/utils/generic-form-validation';
import { User } from '../../../shared/models/user';
import { LoginService } from '../services/login.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  providers: [LoginService]
})
export class Login {

  @ViewChildren(FormControlName, { read: ElementRef }) formInputElements: ElementRef[];

  errors: WritableSignal<any[]> = signal([]);
  loginForm!: FormGroup;
  user!: User;

  public isOAuthModalOpen = signal(false);
  public customGoogleEmail = signal('');
  public customGoogleName = signal('');
  public customGooglePhone = signal('');
  public isLoggingInOAuth = signal(false);
  public showPassword = signal(false);
  public isSubmitting = signal(false);

  validationMessages!: ValidationMessages;
  genericValidator!: GenericValidator;
  displayMessage: DisplayMessage = { email: '', password: '' };

  changesNotSaved: boolean;

  returnUrl: string;

  constructor(private fb: FormBuilder,
    private loginService: LoginService,
    public workspaceService: WorkspaceService,
    private router: Router,
    private destroyRef: DestroyRef,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private changeDetectorRef: ChangeDetectorRef) {

    this.validationMessages = {
      email: {
        required: 'Informe o e-mail',
        email: 'Informe um e-mail válido'
      },
      password: {
        required: 'Informe a senha',
        rangeLength: 'A senha deve possuir entre 6 e 20 caracteres'
      }
    };

    this.genericValidator = new GenericValidator(this.validationMessages);

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    this.destroyRef.onDestroy(() => {
      console.log('Componente Login está sendo destruído.');
    });

  }

  ngOnInit() {

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, CustomValidators.rangeLength([6, 20])]]
    });
  }

  ngAfterViewInit(): void {
    let controlBlurs: Observable<any>[] = this.formInputElements
      .map((formControl: ElementRef) => fromEvent(formControl.nativeElement, 'blur'));

    merge(...controlBlurs).subscribe(() => {
      this.displayMessage = this.genericValidator.processMessages(this.loginForm);
    });
  }

  loginUser() {
    if (this.loginForm.valid) {
      this.isSubmitting.set(true);
      this.user = Object.assign({}, this.user, this.loginForm.value);
      this.loginService.loginUser(this.user)
        .pipe(
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (success) => {
            this.isSubmitting.set(false);
            this.processSuccess(success);
          },
          error: (fail) => {
            this.isSubmitting.set(false);
            this.processFail(fail);
          },
          complete: () => {
            this.isSubmitting.set(false);
          }
        });
    } else {
      this.displayMessage = this.genericValidator.processMessages(this.loginForm);
    }
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  processSuccess(response: User) {
    this.loginForm.reset();
    this.errors.set([]);
    this.loginService.LocalStorage.saveLocalUser(response);
    let toastr = this.toastr.success('Login realizado com sucesso!', 'Bem-vindo!', { easeTime: 200, timeOut: 1500, progressBar: true, closeButton: true });
    if (toastr) {
      toastr.onHidden.subscribe(() => {
        this.returnUrl ? this.router.navigate([this.returnUrl]) : this.router.navigate(['/dashboard']);
      });
      toastr.onTap.subscribe(() => {
        this.returnUrl ? this.router.navigate([this.returnUrl]) : this.router.navigate(['/dashboard']);
      });
    } else {
      this.returnUrl ? this.router.navigate([this.returnUrl]) : this.router.navigate(['/dashboard']);
    }
  }

  processFail(fail: any) {
    this.errors.set([]);
    const errorMsg = fail?.error?.error || fail?.error?.message || 'Falha ao autenticar. Verifique seus dados.';
    this.errors.set(Array.isArray(errorMsg) ? errorMsg : [errorMsg]);
    this.toastr.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg, 'Login de Usuário', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
  }

  openOAuthModal() {
    this.isOAuthModalOpen.set(true);
  }

  closeOAuthModal() {
    this.isOAuthModalOpen.set(false);
  }

  loginWithGoogle(email: string, name?: string, phone?: string) {
    this.isLoggingInOAuth.set(true);
    this.workspaceService.loginWithGoogle(email, name, phone)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoggingInOAuth.set(false);
          this.isOAuthModalOpen.set(false);
          const userName = res?.user?.name || name || 'Usuário';
          this.toastr.success(`Bem-vindo(a), ${userName}!`, 'Login via Google OAuth', {
            timeOut: 1500,
            progressBar: true
          });
          const target = this.returnUrl || '/dashboard';
          this.router.navigate([target]);
        },
        error: (err) => {
          this.isLoggingInOAuth.set(false);
          const msg = err?.error?.error || 'Erro ao autenticar com Google.';
          this.toastr.error(msg, 'Falha no OAuth');
        }
      });
  }

  loginWithCustomGoogle() {
    if (!this.customGoogleEmail()) {
      this.toastr.warning('Informe um e-mail do Google válido.');
      return;
    }
    this.loginWithGoogle(
      this.customGoogleEmail(),
      this.customGoogleName() || this.customGoogleEmail().split('@')[0],
      this.customGooglePhone()
    );
  }

}

