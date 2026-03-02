import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card"><h3>Contract Requests</h3><p>Pending: 5</p><p>Approved: 12</p><p>Rejected: 2</p></section>
  `,
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px}`]
})
export class ContractRequestsPage {}
