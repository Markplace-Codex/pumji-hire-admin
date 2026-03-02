import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDataService, InterviewScheduleItem } from '../data/admin-data.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <h3>Interview Schedules</h3>
      <form class="form" (ngSubmit)="saveInterview()">
        <input [(ngModel)]="form.candidate" name="candidate" placeholder="Candidate" required />
        <input [(ngModel)]="form.role" name="role" placeholder="Role" required />
        <input [(ngModel)]="form.time" name="time" placeholder="Time (e.g. 10:30 AM)" required />
        <button type="submit">{{ editingId ? 'Update' : 'Add' }} Schedule</button>
      </form>
      <table>
        <tr><th>Candidate</th><th>Role</th><th>Time</th><th>Action</th></tr>
        <tr *ngFor="let interview of interviews">
          <td>{{ interview.candidate }}</td><td>{{ interview.role }}</td><td>{{ interview.time }}</td>
          <td><button type="button" (click)="edit(interview)">Edit</button></td>
        </tr>
      </table>
    </section>
  `,
  styles: [`.card{margin:1rem;background:#fff;padding:1rem;border-radius:12px}.form{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr)) auto;gap:.7rem;margin-bottom:1rem} input,button{padding:.6rem;border:1px solid #cbd5e1;border-radius:8px} button{background:#0f172a;color:#fff} table{width:100%;border-collapse:collapse} th,td{padding:.6rem;border-bottom:1px solid #e2e8f0;text-align:left}`]
})
export class InterviewSchedulesPage {
  interviews: InterviewScheduleItem[] = [];
  editingId?: number;
  form: InterviewScheduleItem = { id: 0, candidate: '', role: '', time: '' };

  constructor(private dataService: AdminDataService) {
    this.interviews = this.dataService.getInterviews();
  }

  saveInterview() {
    const payload = { ...this.form, id: this.editingId ?? this.dataService.nextId('interviews') };
    this.dataService.saveInterview(payload, this.editingId);
    this.interviews = this.dataService.getInterviews();
    this.form = { id: 0, candidate: '', role: '', time: '' };
    this.editingId = undefined;
  }

  edit(interview: InterviewScheduleItem) {
    this.form = { ...interview };
    this.editingId = interview.id;
  }
}
