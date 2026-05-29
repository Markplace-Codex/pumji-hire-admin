import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';
import {
  InterviewStats,
  resolveErrorMessage,
} from '../../utils/interview-utils';

type StatCard = { label: string; value: number; color: string; bg: string; icon: string };

@Component({
  selector: 'app-interview-management-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './interview-management-page.component.html',
  styleUrl: './interview-management-page.component.scss',
})
export class InterviewManagementPageComponent {
  private readonly http = inject(HttpClient);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly stats = signal<InterviewStats>({});

  protected readonly statCards = computed<StatCard[]>(() => {
    const s = this.stats();
    return [
      { label: 'Total Interviews',   value: s.totalInterviews   ?? 0, color: '#1d4ed8', bg: '#dbeafe', icon: '📊' },
      { label: 'Completed',          value: s.completed          ?? 0, color: '#065f46', bg: '#d1fae5', icon: '✅' },
      { label: 'Scheduled',          value: s.scheduled          ?? 0, color: '#1d4ed8', bg: '#e0f2fe', icon: '📅' },
      { label: 'Pending',            value: s.pending            ?? 0, color: '#92400e', bg: '#fef3c7', icon: '⏳' },
      { label: 'Cancelled',          value: s.cancelled          ?? 0, color: '#b91c1c', bg: '#fee2e2', icon: '🚫' },
      { label: "Today's Interviews", value: s.todaysInterviews ?? s.todayInterviews ?? 0, color: '#6d28d9', bg: '#ede9fe', icon: '🗓️' },
      { label: 'Candidate Accepted', value: s.candidateAccepted  ?? 0, color: '#065f46', bg: '#d1fae5', icon: '👍' },
      { label: 'Candidate Ignored',  value: s.candidateIgnored   ?? 0, color: '#92400e', bg: '#fef3c7', icon: '👎' },
      { label: 'No Response',        value: s.candidateNoResponse ?? 0, color: '#475569', bg: '#f1f5f9', icon: '🔕' },
    ];
  });

  constructor() {
    this.loadDashboard();
  }

  protected retry(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const base = resolveApiBasePath();

    this.http.get<InterviewStats | { data?: InterviewStats; stats?: InterviewStats }>(`${base}/api/SuperAdmin/GetInterviewStats`).subscribe({
      next: (res) => {
        const s = (res as { data?: InterviewStats }).data ?? (res as { stats?: InterviewStats }).stats ?? (res as InterviewStats);
        this.stats.set(s);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.isLoading.set(false);
      },
    });
  }
}
