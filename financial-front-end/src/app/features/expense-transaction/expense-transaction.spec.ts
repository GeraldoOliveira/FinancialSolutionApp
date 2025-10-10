import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseTransaction } from './expense-transaction';

describe('ExpenseTransaction', () => {
  let component: ExpenseTransaction;
  let fixture: ComponentFixture<ExpenseTransaction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseTransaction]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseTransaction);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
