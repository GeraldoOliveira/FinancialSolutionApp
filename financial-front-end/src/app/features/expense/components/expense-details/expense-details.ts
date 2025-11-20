import { Component, ElementRef, ViewChildren, signal, WritableSignal, QueryList, PipeTransform, Pipe } from '@angular/core';
import { FormArray, FormBuilder, FormControlName, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { RouterLink, ActivatedRoute } from '@angular/router';

import { ToastrService } from 'ngx-toastr';
import { NgxBrazilMASKS } from 'ngx-brazil';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { GenericValidator, ValidationMessages } from '../../../../shared/utils/generic-form-validation';
import { Expense } from '../../../../shared/models/expense-transaction';
import { ExpenseOrigin } from '../../../../shared/models/expense-origin';
import { ExpenseResponsible } from '../../../../shared/models/expense-responsible';
import { ExpenseDelete } from '../expense-delete/expense-delete';

@Pipe({
  name: 'creditCard',
  standalone: true
})
export class CreditCardPipe implements PipeTransform {
  transform(id: string): string {
    switch (id) {
      case '1':
        return 'Infinite - 4195';
      case '2':
        return 'Infinite - 1880';
      case '3':
        return 'Nubank - 2020';
      default:
        return `ID Desconhecido`;
    }
  }
}

@Component({
  selector: 'app-expense-edit',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CreditCardPipe],
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
    private modalService: NgbModal,
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

  openDeleteModal(transaction: Expense): void {
    const modalRef = this.modalService.open(ExpenseDelete);

    modalRef.componentInstance.transaction = transaction;

    modalRef.result.then((result) => {
      if (result === true) {
        // Lógica de exclusão aqui
        console.log(`Exclusão do item ${transaction.id} confirmada.`);
      }
    }, (reason) => {
      console.log(`Exclusão do item ${transaction.id} cancelada.`, reason);
    }
    );
  }
}