import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseEdit } from './expense-edit';

describe('ExpenseEdit', () => {
  let component: ExpenseEdit;
  let fixture: ComponentFixture<ExpenseEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
