import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '../models/user';
import { AccountService } from '../services/account.service';
import { DisplayMessage, GenericValidator, ValidationMessages } from '../../utils/generic-form-validation';

@Component({
  selector: 'app-register',
  imports: [],
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
  displayMessage!: DisplayMessage;

  constructor (private fb: FormBuilder,
               private accountService: AccountService) { 
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
    }
  }

  ngOnInit() {

    this.password = new FormControl('',  [Validators.required, CustomValidators.rangeLength([6,20])])
    this.confirmPassword = new FormControl('', [Validators.required,CustomValidators.rangeLength([6,20]), CustomValidators.equalTo(password)])

    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(60)]],
      email: ['', [Validators.required, Validators.email]],
      password: password 
      confirmPassword: confirmPassword
    }); 
  }

  afterViewInit(){

  }

  registerUser() {
    if (this.registerForm.dirty && this.registerForm.valid) {
      this.user = Object.assign({}, this.user, this.registerForm.value);
      this.accountService.registerUser(this.user);
    }
  }

}
