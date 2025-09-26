import { Component, DestroyRef, ElementRef, inject, ViewChildren } from '@angular/core';
import { FormBuilder, FormControl, FormControlName, FormGroup, Validators } from '@angular/forms';
import { User } from '../models/user';
import { AccountService } from '../services/account.service';
import { DisplayMessage, GenericValidator, ValidationMessages } from '../../utils/generic-form-validation';
import { CustomValidators } from 'ng2-validation';
import { fromEvent, merge, Observable } from 'rxjs';
import { CommonModule  } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';


@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  
  @ViewChildren(FormControlName,  { read: ElementRef }) formInputElements: ElementRef[];

  errors: any[] = [];
  registerForm!: FormGroup;
  user!: User;

  validationMessages!: ValidationMessages;
  genericValidator!: GenericValidator;
  displayMessage: DisplayMessage = {name: '', email: '', password: '', confirmPassword: ''};

  constructor (private fb: FormBuilder,
               private accountService: AccountService,
               private router: Router) { 
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
    });
  }

  registerUser() {
    if (this.registerForm.dirty && this.registerForm.valid) {
      this.user = Object.assign({}, this.user, this.registerForm.value);
      this.accountService.registerUser(this.user)
      .pipe(
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe({
        next: (success) => {
          this.processSuccess(success)
        },
        error: (fail) => {
          this.processFail(fail)
        },
        complete: () => {
          console.log('Registro de usuário completo.');
        }
      }) 
    }
  }

  processSuccess(response: any) {
    this.registerForm.reset(); //limpa o form
    this.errors = [];

    this.accountService.LocalStorage.saveLocalUser(response);

    this.router.navigate(['/home']);
  }

  processFail(fail: any) {
    this.errors = fail.error.errors;
  }

}
