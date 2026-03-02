import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <h3>Credits - Add / Edit</h3>
      <form class="form">
        <input placeholder="Customer ID" />
        <input placeholder="Credit amount" type="number" />
        <select><option>Add Credit</option><option>Edit Credit</option></select>
        <button type="button">Save</button>
      </form>
    </section>
  `,
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px}.form{display:grid;gap:.7rem;max-width:420px} input,select,button{padding:.6rem;border:1px solid #cbd5e1;border-radius:8px} button{background:#0f172a;color:#fff}`]
})
export class CreditsPage {}
