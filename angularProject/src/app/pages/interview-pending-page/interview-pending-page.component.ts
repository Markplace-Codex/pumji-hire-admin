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

type ClassifiedInterview = InterviewScheduleItem & { _urgency: 'overdue' | 'today' | 'upcoming' | 'unknown' };

@Component({
  selector: 'app-interview-pending-page',
  imports: [RouterLink],
  templateUrl: './interview-pending-page.component.html',
  styleUrl: './interview-pending-page.component.scss',
})
export class InterviewPendingPageComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly interviews = signal<ClassifiedInterview[]>([]);

  protected readonly todayCount    = computed(() => this.interviews().filter(i => i._urgency === 'today').length);
  protected readonly upcomingCount = computed(() => this.interviews().filter(i => i._urgency === 'upcoming').length);
  protected readonly overdueCount  = computed(() => this.interviews().filter(i => i._urgency === 'overdue').length);
  protected readonly totalCount    = computed(() => this.interviews().length);

  protected confirmVisible = false;
  protected confirmAction: 'complete' | 'cancel' = 'complete';
  protected confirmId: number | null = null;
  protected confirmLabel = '';
  protected actionInProgress = false;
  protected actionSuccess = signal<string | null>(null);
  protected actionError = signal<string | null>(null);

  constructor() {
    this.loadPending();
  }

  protected getStatusLabel = getStatusLabel;
  protected formatDate = formatDate;
  protected resolveItemId = resolveItemId;

  protected getStatusBadge(status: number | undefined): { bg: string; color: string } {
    return STATUS_COLORS[status ?? 0] ?? { bg: '#f1f5f9', color: '#475569' };
  }

  protected urgencyBorder(u: string): string {
    return { overdue: '#ef4444', today: '#f59e0b', upcoming: '#3b82f6', unknown: '#cbd5e1' }[u] ?? '#cbd5e1';
  }

  protected urgencyLabel(u: string): string {
    return { overdue: '🔴 OVERDUE', today: '⏰ TODAY', upcoming: '📅 UPCOMING', unknown: '' }[u] ?? '';
  }

  protected openConfirm(action: 'complete' | 'cancel', id: number | undefined, candidateName?: string): void {
    if (id == null) return;
    this.confirmAction = action;
    this.confirmId = id;
    this.confirmLabel = candidateName?.trim() || 'this interview';
    this.confirmVisible = true;
    this.actionSuccess.set(null);
    this.actionError.set(null);
  }

  protected cancelConfirm(): void {
    this.confirmVisible = false;
    this.confirmId = null;
  }

  protected executeConfirm(): void {
    if (!this.confirmId) return;
    this.actionInProgress = true;
    const base = resolveApiBasePath();
    const url = this.confirmAction === 'complete'
      ? `${base}/api/SuperAdmin/CompleteInterview/${this.confirmId}`
      : `${base}/api/SuperAdmin/CancelInterview/${this.confirmId}`;

    this.http.put(url, {}).subscribe({
      next: () => {
        this.actionInProgress = false;
        this.confirmVisible = false;
        this.actionSuccess.set(
          `${this.confirmLabel} ${this.confirmAction === 'complete' ? 'completed' : 'cancelled'} successfully.`
        );
        this.loadPending();
      },
      error: (err: HttpErrorResponse) => {
        this.actionInProgress = false;
        this.confirmVisible = false;
        this.actionError.set(resolveErrorMessage(err));
      },
    });
  }

  protected viewDetail(id: number | undefined): void {
    if (id != null) this.router.navigate(['/interview-management/detail', id], { queryParams: { from: 'pending' } });
  }

  protected viewHistory(id: number | undefined): void {
    if (id != null) this.router.navigate(['/interview-management/history', id], { queryParams: { from: 'pending' } });
  }

  protected retry(): void {
    this.loadPending();
  }

  private loadPending(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.get<InterviewApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/GetPendingInterviews`).subscribe({
      next: (res) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const classified = extractRecords(res).map(r => {
          let urgency: ClassifiedInterview['_urgency'] = 'unknown';
          if (r.scheduleDate) {
            const d = new Date(r.scheduleDate);
            d.setHours(0, 0, 0, 0);
            if (d < today)      urgency = 'overdue';
            else if (+d === +today) urgency = 'today';
            else                urgency = 'upcoming';
          }
          return { ...r, _urgency: urgency } as ClassifiedInterview;
        });

        this.interviews.set(classified);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.isLoading.set(false);
      },
    });
  }
}
