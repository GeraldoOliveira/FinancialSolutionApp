import { Component } from '@angular/core';

@Component({
  selector: 'app-expense-delete',
  imports: [],
  templateUrl: './expense-delete.html',
  styleUrl: './expense-delete.css'
})
export class ExpenseDelete {
  cancelDelete() {
    window.history.back();
  }

  confirmDelete() {
    // Implement delete logic here
  }
}
