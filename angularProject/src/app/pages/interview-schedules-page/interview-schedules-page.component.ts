import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type InterviewScheduleItem = {
  id?: number;
  userId?: number;
  scheduleDate?: string;
  scheduleTime?: string | null;
  status?: number;
  createdAt?: string;
  updatedAt?: string;
  feedbackId?: number;
  jobId?: number;
  recruiterId?: number;
  interviewRound?: number;
  candidateAccept?: string | null;
  orderId?: number;
  supportAdminId?: number;
  scheduleTimeSlot?: string | null;
  scheduleType?: number;
  productId?: number;
  keyskills?: string | null;
  serverExtension?: string | null;
  isVideoReady?: boolean;
  prioritizerId?: number;
  isAcceptedDiscount?: boolean;
  completedAt?: string;
  isRetakeInterview?: boolean;
  isPopupClosed?: boolean;
  questionIds?: string | null;
  interviewStatus?: string | null;
};

type PaginationDetails = {
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
};

type InterviewSchedulesApiResponse = {
  paginationOrder?: {
    pagination?: PaginationDetails;
    orderDto?: InterviewScheduleItem[];
  };
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-interview-schedules-page',
  imports: [RouterLink],
  templateUrl: './interview-schedules-page.component.html',
  styleUrl: './interview-schedules-page.component.scss'
})
export class InterviewSchedulesPageComponent {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly defaultPageSize = 5;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly schedules = signal<InterviewScheduleItem[]>([]);

  protected readonly totalCount = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);

  protected readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  protected readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());
  protected readonly pageLabel = computed(() => {
    if (this.totalPages() === 0) {
      return 'Page 0 of 0';
    }

    return `Page ${this.currentPage() + 1} of ${this.totalPages()}`;
  });

  constructor() {
    this.loadInterviewSchedules(0);
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) {
      return;
    }

    this.loadInterviewSchedules(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }

    this.loadInterviewSchedules(this.currentPage() + 1);
  }

  protected retry(): void {
    this.loadInterviewSchedules(this.currentPage());
  }

  protected editSchedule(schedule: InterviewScheduleItem): void {
    this.router.navigate(['/interview-schedules/edit'], {
      state: { schedule }
    });
  }

  private loadInterviewSchedules(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.httpClient
      .get<InterviewSchedulesApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/InterviewSchedules`, {
        params: {
          pageNumber: pageIndex,
          pageSize: this.pageSize()
        }
      })
      .subscribe({
        next: (response) => {
          const pageData = response.paginationOrder?.pagination;

          this.schedules.set(response.paginationOrder?.orderDto ?? []);
          this.totalCount.set(pageData?.totalCount ?? 0);
          this.pageSize.set(pageData?.pageSize ?? this.defaultPageSize);
          this.currentPage.set(pageData?.currentPage ?? pageIndex);
          this.totalPages.set(pageData?.totalPages ?? 0);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 401 || error.status === 403) {
      return 'You are not authorized to view interview schedules. Please sign in again.';
    }

    if (error.status === 404) {
      return 'Interview schedules API endpoint was not found. Please check API configuration.';
    }

    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return 'Unable to load interview schedules right now. Please try again.';
  }
}
