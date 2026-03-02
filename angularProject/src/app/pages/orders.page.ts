import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h3>Orders</h3>
      <table>
        <tr><th>ID</th><th>Customer</th><th>Status</th><th>Amount</th></tr>
        <tr><td>#1001</td><td>Acme Corp</td><td>Processing</td><td>$2,300</td></tr>
        <tr><td>#1002</td><td>Globex</td><td>Completed</td><td>$1,150</td></tr>
      </table>
    </section>
  `,
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px} table{width:100%;border-collapse:collapse} th,td{padding:.6rem;border-bottom:1px solid #e2e8f0;text-align:left}`]
})
export class OrdersPage {}
