import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDataService, CustomerItem } from '../data/admin-data.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <h3>Customers List</h3>
      <form class="form" (ngSubmit)="saveCustomer()">
        <input [(ngModel)]="form.name" name="name" placeholder="Name" required />
        <input [(ngModel)]="form.email" name="email" placeholder="Email" required />
        <input [(ngModel)]="form.company" name="company" placeholder="Company" required />
        <button type="submit">{{ editingId ? 'Update' : 'Add' }} Customer</button>
      </form>
      <table>
        <tr><th>Name</th><th>Email</th><th>Company</th><th>Action</th></tr>
        <tr *ngFor="let customer of customers">
          <td>{{ customer.name }}</td><td>{{ customer.email }}</td><td>{{ customer.company }}</td>
          <td><button type="button" (click)="edit(customer)">Edit</button></td>
        </tr>
      </table>
    </section>
  `,
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px}.form{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr)) auto;gap:.7rem;margin-bottom:1rem} input,button{padding:.6rem;border:1px solid #cbd5e1;border-radius:8px} button{background:#0f172a;color:#fff} table{width:100%;border-collapse:collapse} th,td{padding:.6rem;border-bottom:1px solid #e2e8f0;text-align:left}`]
})
export class CustomersPage {
  customers: CustomerItem[] = [];
  editingId?: number;
  form: CustomerItem = { id: 0, name: '', email: '', company: '' };

  constructor(private dataService: AdminDataService) {
    this.customers = this.dataService.getCustomers();
  }

  saveCustomer() {
    const payload = { ...this.form, id: this.editingId ?? this.dataService.nextId('customers') };
    this.dataService.saveCustomer(payload, this.editingId);
    this.customers = this.dataService.getCustomers();
    this.form = { id: 0, name: '', email: '', company: '' };
    this.editingId = undefined;
  }

  edit(customer: CustomerItem) {
    this.form = { ...customer };
    this.editingId = customer.id;
  }
}
