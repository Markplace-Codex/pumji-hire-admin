import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card"><h3>Interview Schedules</h3><p>09:30 AM - UI Developer (Riya Patel)</p><p>11:15 AM - Node.js Engineer (Karan Shah)</p></section>
  `,
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px}`]
})
export class InterviewSchedulesPage {}
