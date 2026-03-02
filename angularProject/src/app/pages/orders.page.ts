import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDataService, OrderApiError, OrderItem } from '../data/admin-data.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <h3>Orders</h3>
      <p *ngIf="message" class="message">{{ message }}</p>
      <form class="form" (ngSubmit)="saveOrder()">
        <input [(ngModel)]="form.id" name="id" placeholder="Order ID" required />
        <input [(ngModel)]="form.customer" name="customer" placeholder="Customer" required />
        <input [(ngModel)]="form.status" name="status" placeholder="Status" required />
        <input [(ngModel)]="form.amount" name="amount" type="number" placeholder="Amount" required />
        <button type="submit" [disabled]="isSaving">{{ editingId ? 'Update' : 'Add' }} Order</button>
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
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px}.message{margin:0 0 .8rem;color:#0f766e}.form{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr)) auto;gap:.6rem;margin-bottom:1rem} input,button{padding:.55rem;border:1px solid #cbd5e1;border-radius:8px} button{background:#0f172a;color:#fff} button[disabled]{opacity:.6;cursor:not-allowed} table{width:100%;border-collapse:collapse} th,td{padding:.6rem;border-bottom:1px solid #e2e8f0;text-align:left}`]
})
export class OrdersPage {
  orders: OrderItem[] = [];
  editingId?: string;
  isSaving = false;
  message = '';
  form: OrderItem = { id: '', customer: '', status: '', amount: 0 };

  constructor(private dataService: AdminDataService) {
    void this.loadOrders();
  }

  async loadOrders() {
    try {
      this.orders = await this.dataService.getOrdersFromDb();
      this.message = '';
    } catch {
      this.message = 'Could not load orders from SQL database.';
      this.orders = this.dataService.getOrders();
    }
  }

  async saveOrder() {
    this.isSaving = true;
    this.message = '';

    try {
      await this.dataService.saveOrderToDb({ ...this.form, amount: Number(this.form.amount) }, this.editingId);
      this.orders = this.dataService.getOrders();
      this.form = { id: '', customer: '', status: '', amount: 0 };
      this.editingId = undefined;
      this.message = 'Order saved successfully.';
    } catch (error) {
      if (error instanceof OrderApiError) {
        this.message = error.message;
      } else {
        this.message = 'Unable to save order. Please try again.';
      }
    } finally {
      this.isSaving = false;
    }
  }

  edit(order: OrderItem) {
    this.form = { ...order };
    this.editingId = order.id;
    this.message = '';
  }
}
