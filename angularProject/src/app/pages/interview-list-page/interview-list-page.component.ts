import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';
import {
  InterviewScheduleItem,
  InterviewApiResponse,
  PaginationDetails,
  STATUS_OPTIONS,
  STATUS_COLORS,
  getStatusLabel,
  extractRecords,
  extractPagination,
  resolveItemId,
  formatDate,
  resolveErrorMessage,
} from '../../utils/interview-utils';

@Component({
  selector: 'app-interview-list-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './interview-list-page.component.html',
  styleUrl: './interview-list-page.component.scss',
})
export class InterviewListPageComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly interviews = signal<InterviewScheduleItem[]>([]);
  protected readonly pagination = signal<PaginationDetails>({});

  protected readonly totalCount = computed(() => this.pagination().totalCount ?? 0);
  protected readonly totalPages = computed(() => this.pagination().totalPages ?? 0);
  protected readonly currentPage = computed(() => this.pagination().currentPage ?? 0);
  protected readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  protected readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());
  protected readonly pageLabel = computed(() =>
    this.totalPages() === 0 ? 'Page 0 of 0' : `Page ${this.currentPage() + 1} of ${this.totalPages()}`
  );

  // Filters
  protected searchId = '';
  protected selectedStatus: number | '' = '';
  protected dateFrom = '';
  protected dateTo = '';
  protected searchUserId = '';
  protected selectedAccept = '';
  protected isFilterApplied = false;

  // Confirm action modal
  protected confirmVisible = false;
  protected confirmAction: 'complete' | 'cancel' = 'complete';
  protected confirmId: number | null = null;
  protected confirmLabel = '';
  protected actionInProgress = false;
  protected actionSuccess = signal<string | null>(null);
  protected actionError = signal<string | null>(null);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly candidateAcceptOptions = ['', 'Accept', 'Ignore'];

  protected readonly pageSize = 15;

  constructor() {
    this.loadInterviews(0);
  }

  protected getStatusLabel = getStatusLabel;
  protected formatDate = formatDate;
  protected resolveItemId = resolveItemId;

  protected getStatusBadge(status: number | undefined): { bg: string; color: string } {
    return STATUS_COLORS[status ?? 0] ?? { bg: '#f1f5f9', color: '#475569' };
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) return;
    this.loadInterviews(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) return;
    this.loadInterviews(this.currentPage() + 1);
  }

  protected applyFilters(): void {
    this.isFilterApplied = true;
    this.loadInterviews(0);
  }

  protected clearFilters(): void {
    this.searchId = '';
    this.selectedStatus = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.searchUserId = '';
    this.selectedAccept = '';
    this.isFilterApplied = false;
    this.loadInterviews(0);
  }

  protected retry(): void {
    this.loadInterviews(this.currentPage());
  }

  protected viewDetail(id: number | undefined): void {
    if (id != null) {
      this.router.navigate(['/interview-management/detail', id]);
    }
  }

  protected viewHistory(id: number | undefined): void {
    if (id != null) {
      this.router.navigate(['/interview-management/history', id]);
    }
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
    const endpoint = this.confirmAction === 'complete'
      ? `${base}/api/SuperAdmin/CompleteInterview/${this.confirmId}`
      : `${base}/api/SuperAdmin/CancelInterview/${this.confirmId}`;

    this.http.put(endpoint, {}).subscribe({
      next: () => {
        this.actionInProgress = false;
        this.confirmVisible = false;
        this.actionSuccess.set(
          `${this.confirmLabel} ${this.confirmAction === 'complete' ? 'marked as Completed' : 'Cancelled'} successfully.`
        );
        this.loadInterviews(this.currentPage());
      },
      error: (err: HttpErrorResponse) => {
        this.actionInProgress = false;
        this.confirmVisible = false;
        this.actionError.set(resolveErrorMessage(err));
      },
    });
  }

  private loadInterviews(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const base = resolveApiBasePath();

    // API uses Page/PageSize (capital); always send both
    const params: Record<string, string | number> = {
      PageSize: this.pageSize,
      Page: pageIndex,
    };

    if (this.isFilterApplied) {
      if (this.selectedStatus !== '') params['Status']          = this.selectedStatus;
      if (this.dateFrom)              params['FromDate']        = this.dateFrom;
      if (this.dateTo)                params['ToDate']          = this.dateTo;
      if (this.selectedAccept)        params['CandidateAccept'] = this.selectedAccept;
      if (this.searchUserId.trim())   params['RecruiterId']     = this.searchUserId.trim();
    }

    this.http.get<InterviewApiResponse | InterviewScheduleItem[]>(
      `${base}/api/SuperAdmin/GetAllInterviews`, { params }
    ).subscribe({
      next: (res) => {
        // Handle both raw array and wrapped object responses
        let records: InterviewScheduleItem[] = Array.isArray(res)
          ? (res as InterviewScheduleItem[])
          : extractRecords(res as InterviewApiResponse);

        const apiRes = Array.isArray(res) ? null : (res as InterviewApiResponse);
        const pgData = apiRes ? extractPagination(apiRes) : null;

        // Client-side filtering fallback
        if (this.isFilterApplied) {
          if (this.searchId.trim()) {
            records = records.filter(r =>
              String(resolveItemId(r) ?? '').includes(this.searchId.trim())
            );
          }
          if (this.selectedStatus !== '') {
            records = records.filter(r => r.status === Number(this.selectedStatus));
          }
          if (this.selectedAccept) {
            records = records.filter(r =>
              (r.candidateAccept ?? '').toLowerCase().includes(this.selectedAccept.toLowerCase())
            );
          }
          if (this.dateFrom) {
            records = records.filter(r => r.scheduleDate && r.scheduleDate >= this.dateFrom);
          }
          if (this.dateTo) {
            records = records.filter(r => r.scheduleDate && r.scheduleDate <= this.dateTo + 'T23:59:59');
          }
        }

        this.interviews.set(records);
        this.pagination.set({
          totalCount:  pgData?.totalCount  ?? records.length,
          pageSize:    pgData?.pageSize    ?? this.pageSize,
          currentPage: pgData?.currentPage ?? pageIndex,
          totalPages:  pgData?.totalPages  ?? (Math.ceil(records.length / this.pageSize) || 1),
        });
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(resolveErrorMessage(err));
        this.isLoading.set(false);
      },
    });
  }
}
