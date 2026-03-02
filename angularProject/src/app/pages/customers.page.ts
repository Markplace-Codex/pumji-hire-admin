import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card"><h3>Customers List</h3><ul><li>Acme Corp</li><li>Globex</li><li>Umbrella Inc</li></ul></section>
  `,
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px}`]
})
export class CustomersPage {}
