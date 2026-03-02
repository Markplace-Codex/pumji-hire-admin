import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h3>Contact Us Requests</h3>
      <p><strong>Rahul:</strong> Need enterprise pricing details.</p>
      <p><strong>Nina:</strong> Requesting call back for onboarding support.</p>
    </section>
  `,
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px}`]
})
export class ContactUsRequestsPage {}
