import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDataService, OrderItem } from '../data/admin-data.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <h3>Orders</h3>
      <form class="form" (ngSubmit)="saveOrder()">
        <input [(ngModel)]="form.id" name="id" placeholder="Order ID" required />
        <input [(ngModel)]="form.customer" name="customer" placeholder="Customer" required />
        <input [(ngModel)]="form.status" name="status" placeholder="Status" required />
        <input [(ngModel)]="form.amount" name="amount" type="number" placeholder="Amount" required />
        <button type="submit">{{ editingId ? 'Update' : 'Add' }} Order</button>
      </form>
      <table>
        <tr><th>ID</th><th>Customer</th><th>Status</th><th>Amount</th><th>Action</th></tr>
        <tr *ngFor="let order of orders">
          <td>{{ order.id }}</td>
          <td>{{ order.customer }}</td>
          <td>{{ order.status }}</td>
          <td>{{ order.amount | currency }}</td>
          <td><button type="button" (click)="edit(order)">Edit</button></td>
        </tr>
      </table>
    </section>
  `,
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px}.form{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr)) auto;gap:.6rem;margin-bottom:1rem} input,button{padding:.55rem;border:1px solid #cbd5e1;border-radius:8px} button{background:#0f172a;color:#fff} table{width:100%;border-collapse:collapse} th,td{padding:.6rem;border-bottom:1px solid #e2e8f0;text-align:left}`]
})
export class OrdersPage {
  orders: OrderItem[] = [];
  editingId?: string;
  form: OrderItem = { id: '', customer: '', status: '', amount: 0 };

  constructor(private dataService: AdminDataService) {
    this.orders = this.dataService.getOrders();
  }

  saveOrder() {
    this.dataService.saveOrder({ ...this.form }, this.editingId);
    this.orders = this.dataService.getOrders();
    this.form = { id: '', customer: '', status: '', amount: 0 };
    this.editingId = undefined;
  }

  edit(order: OrderItem) {
    this.form = { ...order };
    this.editingId = order.id;
  }
}
