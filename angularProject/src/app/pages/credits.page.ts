import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDataService, CreditItem } from '../data/admin-data.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <h3>Credits - Add / Edit</h3>
      <form class="form" (ngSubmit)="saveCredit()">
        <input [(ngModel)]="form.customerId" name="customerId" placeholder="Customer ID" required />
        <input [(ngModel)]="form.amount" name="amount" placeholder="Credit amount" type="number" required />
        <select [(ngModel)]="form.action" name="action">
          <option>Add Credit</option><option>Edit Credit</option>
        </select>
        <button type="submit">{{ editingId ? 'Update' : 'Save' }}</button>
      </form>
      <table>
        <tr><th>ID</th><th>Customer ID</th><th>Amount</th><th>Type</th><th>Action</th></tr>
        <tr *ngFor="let credit of credits">
          <td>{{ credit.id }}</td><td>{{ credit.customerId }}</td><td>{{ credit.amount }}</td><td>{{ credit.action }}</td>
          <td><button type="button" (click)="edit(credit)">Edit</button></td>
        </tr>
      </table>
    </section>
  `,
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px}.form{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr)) auto;gap:.7rem;margin-bottom:1rem} input,select,button{padding:.6rem;border:1px solid #cbd5e1;border-radius:8px} button{background:#0f172a;color:#fff} table{width:100%;border-collapse:collapse} th,td{padding:.6rem;border-bottom:1px solid #e2e8f0;text-align:left}`]
})
export class CreditsPage {
  credits: CreditItem[] = [];
  editingId?: number;
  form: CreditItem = { id: 0, customerId: '', amount: 0, action: 'Add Credit' };

  constructor(private dataService: AdminDataService) {
    this.credits = this.dataService.getCredits();
  }

  saveCredit() {
    const payload = { ...this.form, id: this.editingId ?? this.dataService.nextId('credits') };
    this.dataService.saveCredit(payload, this.editingId);
    this.credits = this.dataService.getCredits();
    this.form = { id: 0, customerId: '', amount: 0, action: 'Add Credit' };
    this.editingId = undefined;
  }

  edit(credit: CreditItem) {
    this.form = { ...credit };
    this.editingId = credit.id;
  }
}
