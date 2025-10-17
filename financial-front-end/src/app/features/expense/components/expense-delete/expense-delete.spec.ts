import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseDelete } from './expense-delete';

describe('ExpenseDelete', () => {
  let component: ExpenseDelete;
  let fixture: ComponentFixture<ExpenseDelete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseDelete]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseDelete);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
