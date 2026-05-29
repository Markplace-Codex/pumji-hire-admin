import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';
import {
  InterviewScheduleItem,
  InterviewApiResponse,
  STATUS_COLORS,
  getStatusLabel,
  extractRecords,
  resolveItemId,
  formatDate,
  resolveErrorMessage,
} from '../../utils/interview-utils';

@Component({
  selector: 'app-interview-completed-page',
  imports: [RouterLink],
  templateUrl: './interview-completed-page.component.html',
  styleUrl: './interview-completed-page.component.scss',
})
export class InterviewCompletedPageComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly interviews = signal<InterviewScheduleItem[]>([]);
  protected readonly totalCount = computed(() => this.interviews().length);

  constructor() {
    this.loadCompleted();
  }

  protected getStatusLabel = getStatusLabel;
  protected formatDate = formatDate;
  protected resolveItemId = resolveItemId;

  protected getStatusBadge(status: number | undefined): { bg: string; color: string } {
    return STATUS_COLORS[status ?? 0] ?? { bg: '#f1f5f9', color: '#475569' };
  }

  protected viewDetail(id: number | undefined): void {
    if (id != null) this.router.navigate(['/interview-management/detail', id], { queryParams: { from: 'completed' } });
  }

  protected viewHistory(id: number | undefined): void {
    if (id != null) this.router.navigate(['/interview-management/history', id], { queryParams: { from: 'completed' } });
  }

  protected retry(): void {
    this.loadCompleted();
  }

  private loadCompleted(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.get<InterviewApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/GetCompletedInterviews`).subscribe({
      next: (res) => {
        this.interviews.set(extractRecords(res));
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.isLoading.set(false);
      },
    });
  }
}
