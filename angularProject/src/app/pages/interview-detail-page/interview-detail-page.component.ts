import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';
import {
  InterviewScheduleItem,
  STATUS_COLORS,
  getStatusLabel,
  formatDate,
  resolveErrorMessage,
} from '../../utils/interview-utils';

@Component({
  selector: 'app-interview-detail-page',
  imports: [RouterLink],
  templateUrl: './interview-detail-page.component.html',
  styleUrl: './interview-detail-page.component.scss',
})
export class InterviewDetailPageComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly interview = signal<InterviewScheduleItem | null>(null);

  protected confirmVisible = false;
  protected confirmAction: 'complete' | 'cancel' = 'complete';
  protected actionInProgress = false;
  protected actionSuccess = signal<string | null>(null);
  protected actionError = signal<string | null>(null);

  protected readonly interviewId: number;
  protected readonly backLink: string;
  protected readonly backLabel: string;
  private readonly from: string | null;

  constructor() {
    this.interviewId = Number(this.route.snapshot.paramMap.get('id'));
    this.from = this.route.snapshot.queryParamMap.get('from');
    if (this.from === 'completed') {
      this.backLink = '/interview-management/completed';
      this.backLabel = '← Back to Completed Interviews';
    } else if (this.from === 'pending') {
      this.backLink = '/interview-management/pending';
      this.backLabel = '← Back to Pending Interviews';
    } else {
      this.backLink = '/interview-management/list';
      this.backLabel = '← Back to All Interviews';
    }
    this.loadInterview();
  }

  protected getStatusLabel = getStatusLabel;
  protected formatDate = formatDate;

  protected getStatusBadge(status: number | undefined): { bg: string; color: string } {
    return STATUS_COLORS[status ?? 0] ?? { bg: '#f1f5f9', color: '#475569' };
  }

  protected openConfirm(action: 'complete' | 'cancel'): void {
    this.confirmAction = action;
    this.confirmVisible = true;
    this.actionSuccess.set(null);
    this.actionError.set(null);
  }

  protected cancelConfirm(): void {
    this.confirmVisible = false;
  }

  protected executeConfirm(): void {
    this.actionInProgress = true;
    const base = resolveApiBasePath();
    const endpoint = this.confirmAction === 'complete'
      ? `${base}/api/SuperAdmin/CompleteInterview/${this.interviewId}`
      : `${base}/api/SuperAdmin/CancelInterview/${this.interviewId}`;

    this.http.put(endpoint, {}).subscribe({
      next: () => {
        this.actionInProgress = false;
        this.confirmVisible = false;
        const name = this.interview()?.candidateName?.trim() || 'Interview';
        this.actionSuccess.set(
          `${name} ${this.confirmAction === 'complete' ? 'marked as Completed' : 'Cancelled'} successfully.`
        );
        this.loadInterview();
      },
      error: (err: HttpErrorResponse) => {
        this.actionInProgress = false;
        this.confirmVisible = false;
        this.actionError.set(resolveErrorMessage(err));
      },
    });
  }

  protected viewHistory(): void {
    const params = this.from ? { from: this.from } : {};
    this.router.navigate(['/interview-management/history', this.interviewId], { queryParams: params });
  }

  protected retry(): void {
    this.loadInterview();
  }

  private loadInterview(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const base = resolveApiBasePath();

    this.http.get<unknown>(`${base}/api/SuperAdmin/GetInterviewById/${this.interviewId}`).subscribe({
      next: (res) => {
        // Normalise: API may return { interview: {...} } or object directly
        const raw = res as Record<string, unknown>;
        const iv = (raw['interview'] ?? raw['interviewSchedule'] ?? raw['data'] ?? raw) as InterviewScheduleItem;
        this.interview.set(Array.isArray(iv) ? iv[0] : iv);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.isLoading.set(false);
      },
    });
  }
}
