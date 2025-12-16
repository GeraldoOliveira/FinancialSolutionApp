import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ChangeDetectorRef, Component, DestroyRef, ElementRef, ViewChildren, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormControl, FormControlName, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { CustomValidators } from 'ng2-validation';
import { fromEvent, merge, Observable } from 'rxjs';

import { ToastrService } from 'ngx-toastr';

import { DisplayMessage, GenericValidator, ValidationMessages } from '../../../shared/utils/generic-form-validation';
import { User } from '../../../shared/models/user';
import { LoginService } from '../services/login.service';


@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  providers: [LoginService]
})
export class Login {

  @ViewChildren(FormControlName, { read: ElementRef }) formInputElements: ElementRef[];

  errors: WritableSignal<any[]> = signal([]);
  loginForm!: FormGroup;
  user!: User;

  validationMessages!: ValidationMessages;
  genericValidator!: GenericValidator;
  displayMessage: DisplayMessage = { email: '', password: '' };

  changesNotSaved: boolean;

  returnUrl: string;

  constructor(private fb: FormBuilder,
    private loginService: LoginService,
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
    if (this.loginForm.dirty && this.loginForm.valid) {
      this.user = Object.assign({}, this.user, this.loginForm.value);
      this.loginService.loginUser(this.user)
        .pipe(
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (success) => {
            this.processSuccess(success)
          },
          error: (fail) => {
            this.processFail(fail)
          },
          complete: () => {
          }
        })
    }
  }

  processSuccess(response: User) {
    this.loginForm.reset();
    this.errors.set([]);
    this.loginService.LocalStorage.saveLocalUser(response);
    let toastr = this.toastr.success('Login realizado com sucesso!', 'Bem vindo!!!', { easeTime: 200, timeOut: 1500, progressBar: true, closeButton: true });
    if (toastr) {
      toastr.onHidden.subscribe(() => {
        this.returnUrl ? this.router.navigate([this.returnUrl]) : this.router.navigate(['/dashboard']);
      }),
        toastr.onTap.subscribe(() => {
          this.returnUrl ? this.router.navigate([this.returnUrl]) : this.router.navigate(['/dashboard']);
        })
    }
  }

  processFail(fail: any) {
    this.errors.set([]);
    this.errors.set([fail.error.error]);
    this.toastr.error('Ocorreu um erro!', 'Login de Usuário', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
  }

}
