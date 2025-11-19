import { Component, DestroyRef, ElementRef, ViewChildren, signal, WritableSignal, QueryList } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControlName, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, Observable, of, Subscription, switchMap } from 'rxjs';
import { Router, RouterLink } from '@angular/router';

import { ToastrService } from 'ngx-toastr';

import { DisplayMessage, GenericValidator, ValidationMessages } from '../../../../shared/utils/generic-form-validation';
import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../../../shared/models/expense-transaction';
import { ExpenseOrigin } from '../../../../shared/models/expense-origin';
import { ExpenseResponsible } from '../../../../shared/models/expense-responsible';
import { NgxBrazilMASKS, MaskedInputDirective } from 'ngx-brazil';
import { StringUtils } from '../../../../shared/utils/string-utils';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-expense-edit',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './expense-details.html',
  styleUrl: './expense-details.css'
})
export class ExpenseDetails {
  @ViewChildren(FormControlName, { read: ElementRef }) formInputElements: QueryList<ElementRef>;

  MASKS = NgxBrazilMASKS;


  errors: WritableSignal<any[]> = signal([]);
  isWritableDescription: WritableSignal<boolean> = signal(false);
  expenseResposiblesArraySignal: WritableSignal<FormArray> = signal(
    new FormArray<any>([])
  );


  controlBlurs: Observable<any>[];

  expenseTransaction: Expense;
  expenseOrigin: ExpenseOrigin;
  expenseResponsibles: ExpenseResponsible;
  expenseForm!: FormGroup;

  validationMessages!: ValidationMessages;
  genericValidator!: GenericValidator;
  
  expense: any;

  constructor(private fb: FormBuilder,
              private toastr: ToastrService,
              private route: ActivatedRoute,
  ) {
      this.expense = this.route.snapshot.data['expense'];
  }

  ngOnInit() {
    this.expenseForm = this.fb.group({
      expenseOrigin: this.fb.group({
        name: ['', [Validators.required]],
        description: ['', [Validators.required]]
      }),
      totalValue: ['', [Validators.required]],
      methodList: ['', [Validators.required]],
      creditCardList: ['', [Validators.required]],
      installments: ['', [Validators.required]],
      expenseResponsibles: this.fb.array([]),
      categoryList: ['', [Validators.required]],
      date: ['', [Validators.required]],
    });

    this.setExpenseResponsiblesForEdit(this.expense.expenseResponsibles);

    this.expenseForm.patchValue({
      expenseOrigin: this.expense.expenseOrigin,
      totalValue: this.expense.totalValue,
      methodList: this.expense.methodList,
      creditCardList: this.expense.creditCardList,
      installments: this.expense.installments,
      expenseResponsibles: this.expense.expenseResponsibles,
      categoryList: this.expense.categoryList,
      date: this.expense.date
    });

    const initialFormArray = this.expenseForm.get('expenseResponsibles') as FormArray;
    this.expenseResposiblesArraySignal.set(initialFormArray);
    
  }

  expenseResposiblesArrayItem(): FormArray {
    return this.expenseForm.get('expenseResponsibles') as FormArray;
  }

  private setExpenseResponsiblesForEdit(responsibles: ExpenseResponsible[]): void {
    const arrayControl = this.expenseForm.get('expenseResponsibles') as FormArray;

    if (!responsibles || responsibles.length === 0) {
      arrayControl.push(this.createExpenseResponsibleGroup());
      return;
    }

    responsibles.forEach(responsible => {
      const responsibleGroup = this.createExpenseResponsibleGroup();
      responsibleGroup.patchValue({
        responsibleId: responsible.responsibleId,
        proratedValue: responsible.proratedValue
      });
      arrayControl.push(responsibleGroup);

    });
  }
  
  private createExpenseResponsibleGroup(): FormGroup {
    return this.fb.group({
      responsibleId: ['', [Validators.required]],
      proratedValue: [0, [Validators.required]]
    });
  }
}