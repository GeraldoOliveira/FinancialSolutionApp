import { ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, ViewChildren, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormControl, FormControlName, FormGroup, Validators } from '@angular/forms';
import { CommonModule  } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { CustomValidators } from 'ng2-validation';
import { fromEvent, merge, Observable } from 'rxjs';

import { ToastrService } from 'ngx-toastr';

import { DisplayMessage, GenericValidator, ValidationMessages } from '../../utils/generic-form-validation';
import { AccountService } from '../services/account.service';
import { User } from '../models/user';


@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  
  @ViewChildren(FormControlName,  { read: ElementRef }) formInputElements: ElementRef[];

  errors: WritableSignal<any[]> = signal([]);
  registerForm!: FormGroup;
  user!: User;

  validationMessages!: ValidationMessages;
  genericValidator!: GenericValidator;
  displayMessage: DisplayMessage = {name: '', email: '', password: '', confirmPassword: ''};

  changesNotSaved: boolean;

  constructor (private fb: FormBuilder,
               private accountService: AccountService,
               private router: Router,
               private destroyRef: DestroyRef,
               private toastr: ToastrService, 
               private changeDetectorRef: ChangeDetectorRef ) { 
    this.validationMessages = {
      name: {
        required: 'Informe o nome',
        minlength: 'O nome deve ter no mínimo 5 caracteres',
        maxlength: 'O nome deve ter no máximo 60 caracteres',
        rangeLength: 'O nome deve ter entre 5 e 60 caracteres'
      },
      email: {
        required: 'Informe o e-mail',
        email: 'Informe um e-mail válido'
      },
      password: {
        required: 'Informe a senha',
        rangeLength: 'A senha deve possuir entre 6 e 20 caracteres'
      },
      confirmPassword: {
        required: 'Informe a senha novamente',
        rangeLength: 'A senha deve possuir entre 6 e 20 caracteres',
        equalTo: 'As senhas não conferem'
      }
    };

    this.genericValidator = new GenericValidator(this.validationMessages);

    this.destroyRef.onDestroy(() => {
      console.log('Componente _Register está sendo destruído.');
    });

  }

  ngOnInit() {

    let passwordControl = new FormControl('', [Validators.required, CustomValidators.rangeLength([6,20])]);
    let confirmPasswordControl = new FormControl('', [Validators.required, CustomValidators.rangeLength([6,20]), CustomValidators.equalTo(passwordControl)]);

    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(60)]],
      email: ['', [Validators.required, Validators.email]],
      password: passwordControl,
      confirmPassword: confirmPasswordControl
    }); 
  }

  ngAfterViewInit(): void {
    let controlBlurs: Observable<any>[] = this.formInputElements
      .map((formControl: ElementRef) => fromEvent(formControl.nativeElement, 'blur'));

    merge(...controlBlurs).subscribe(() => {
      this.displayMessage = this.genericValidator.processMessages(this.registerForm);
      this.changesNotSaved = true;
    });
  }

  registerUser() {
    if (this.registerForm.dirty && this.registerForm.valid) {
      this.user = Object.assign({}, this.user, this.registerForm.value);
      this.accountService.registerUser(this.user)
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
          this.changesNotSaved = false;
        }
      }) 
    }
  }

  processSuccess(response: User) {
    this.registerForm.reset();
    this.errors.set([]);
    this.accountService.LocalStorage.saveLocalUser(response);
    let toastr = this.toastr.success('Registro realizado com sucesso!', 'Bem vindo!!!', { easeTime: 200, timeOut: 1500, progressBar: true, closeButton: true });
    if (toastr) {
      toastr.onHidden.subscribe(() => {
        this.router.navigate(['/login']);
      }),
      toastr.onTap.subscribe(() => {
        this.router.navigate(['/login']);
      })
    }
  }

  processFail(fail: any) {
    this.errors.set([]); 
    this.errors.set([fail.error.error]);
    this.toastr.error('Ocorreu um erro!', 'Registro de Usuário', { easeTime: 200, timeOut: 4000, progressBar: true, closeButton: true });
  }

}
