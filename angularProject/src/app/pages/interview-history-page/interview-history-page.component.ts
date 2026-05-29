import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';
import { InterviewHistoryItem, formatDate, resolveErrorMessage } from '../../utils/interview-utils';

@Component({
  selector: 'app-interview-history-page',
  imports: [RouterLink],
  templateUrl: './interview-history-page.component.html',
  styleUrl: './interview-history-page.component.scss',
})
export class InterviewHistoryPageComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly history = signal<InterviewHistoryItem[]>([]);
  protected readonly interviewId: number;
  protected readonly backLink: string;
  protected readonly backLabel: string;

  constructor() {
    this.interviewId = Number(this.route.snapshot.paramMap.get('id'));
    const from = this.route.snapshot.queryParamMap.get('from');
    if (from === 'completed') {
      this.backLink = '/interview-management/completed';
      this.backLabel = '← Back to Completed Interviews';
    } else if (from === 'pending') {
      this.backLink = '/interview-management/pending';
      this.backLabel = '← Back to Pending Interviews';
    } else {
      this.backLink = `/interview-management/detail/${this.interviewId}`;
      this.backLabel = `← Back to Interview`;
    }
    this.loadHistory();
  }

  protected formatDate = formatDate;

  protected actionIcon(item: InterviewHistoryItem): string {
    const type = (item.actionType ?? item.action ?? '').toLowerCase();
    if (type.includes('complet')) return '✅';
    if (type.includes('cancel'))  return '❌';
    if (type.includes('creat'))   return '🟢';
    if (type.includes('updat'))   return '🔵';
    if (type.includes('reschedul')) return '🔄';
    return '⚪';
  }

  protected actionColor(item: InterviewHistoryItem): string {
    const type = (item.actionType ?? item.action ?? '').toLowerCase();
    if (type.includes('complet')) return '#16a34a';
    if (type.includes('cancel'))  return '#dc2626';
    if (type.includes('creat'))   return '#6366f1';
    if (type.includes('updat'))   return '#2563eb';
    return '#94a3b8';
  }

  protected actionLabel(item: InterviewHistoryItem): string {
    return item.actionType ?? item.action ?? 'Action';
  }

  protected messageOf(item: InterviewHistoryItem): string {
    return item.message ?? item.description ?? '';
  }

  protected adminOf(item: InterviewHistoryItem): string {
    const id = item.adminId ?? item.userId ?? item.performedBy;
    return id != null ? String(id) : '—';
  }

  protected timestampOf(item: InterviewHistoryItem): string {
    return item.createdAt ?? item.timestamp ?? '';
  }

  protected retry(): void {
    this.loadHistory();
  }

  private loadHistory(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.get<unknown>(`${resolveApiBasePath()}/api/SuperAdmin/GetInterviewHistory/${this.interviewId}`).subscribe({
      next: (res) => {
        const raw = res as Record<string, unknown>;
        const list = Array.isArray(res)
          ? (res as InterviewHistoryItem[])
          : ((raw['interviewHistory'] ?? raw['history'] ?? raw['data'] ?? raw['interviewHistories'] ?? []) as InterviewHistoryItem[]);
        this.history.set(list);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        // 404 means no history exists for this interview — treat as empty, not an error
        if (err.status === 404) {
          this.history.set([]);
          this.isLoading.set(false);
        } else {
          this.errorMessage.set(resolveErrorMessage(err));
          this.isLoading.set(false);
        }
      },
    });
  }
}
