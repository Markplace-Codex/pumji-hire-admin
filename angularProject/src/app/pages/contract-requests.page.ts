import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDataService, ContractRequestItem } from '../data/admin-data.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <h3>Contract Requests</h3>
      <form class="form" (ngSubmit)="saveRequest()">
        <input [(ngModel)]="form.company" name="company" placeholder="Company" required />
        <input [(ngModel)]="form.contractType" name="contractType" placeholder="Contract Type" required />
        <select [(ngModel)]="form.status" name="status">
          <option>Pending</option><option>Approved</option><option>Rejected</option>
        </select>
        <button type="submit">{{ editingId ? 'Update' : 'Add' }} Request</button>
      </form>
      <table>
        <tr><th>Company</th><th>Type</th><th>Status</th><th>Action</th></tr>
        <tr *ngFor="let request of requests">
          <td>{{ request.company }}</td><td>{{ request.contractType }}</td><td>{{ request.status }}</td>
          <td><button type="button" (click)="edit(request)">Edit</button></td>
        </tr>
      </table>
    </section>
  `,
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px}.form{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr)) auto;gap:.7rem;margin-bottom:1rem} input,select,button{padding:.6rem;border:1px solid #cbd5e1;border-radius:8px} button{background:#0f172a;color:#fff} table{width:100%;border-collapse:collapse} th,td{padding:.6rem;border-bottom:1px solid #e2e8f0;text-align:left}`]
})
export class ContractRequestsPage {
  requests: ContractRequestItem[] = [];
  editingId?: number;
  form: ContractRequestItem = { id: 0, company: '', contractType: '', status: 'Pending' };

  constructor(private dataService: AdminDataService) {
    this.requests = this.dataService.getContractRequests();
  }

  saveRequest() {
    const payload = { ...this.form, id: this.editingId ?? this.dataService.nextId('contractRequests') };
    this.dataService.saveContractRequest(payload, this.editingId);
    this.requests = this.dataService.getContractRequests();
    this.form = { id: 0, company: '', contractType: '', status: 'Pending' };
    this.editingId = undefined;
  }

  edit(request: ContractRequestItem) {
    this.form = { ...request };
    this.editingId = request.id;
  }
}
