import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { CustomerBasicInfoSchema } from '../../api/model/customerBasicInfoSchema';
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
  orderDto?: InterviewScheduleItem[];
  interviewSchedule?: InterviewScheduleItem[];
  interviewSchedules?: InterviewScheduleItem[];
  isSuccess?: boolean;
  message?: string | null;
};

type SearchInterviewSchedulesRequest = {
  customerName: string | string[];
  scheduleDate?: string | string[];
  scheduleTime?: string | string[];
  status: number | '';
};

type InterviewStatusOption = {
  value: number;
  label: string;
};

@Component({
  selector: 'app-interview-schedules-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './interview-schedules-page.component.html',
  styleUrl: './interview-schedules-page.component.scss'
})
export class InterviewSchedulesPageComponent {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly defaultPageSize = 5;
  private customerInfoAccessDenied = false;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly schedules = signal<InterviewScheduleItem[]>([]);
  protected readonly customerNameByUserId = signal<Record<number, string>>({});

  protected readonly totalCount = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);

  protected customerNameFilter = '';
  protected scheduleDateFilter = '';
  protected scheduleTimeFilter = '';
  protected statusFilter: number | '' = '';
  protected isFilterApplied = false;

  protected readonly statusOptions: InterviewStatusOption[] = [
    { value: 1, label: 'Scheduled' },
    { value: 2, label: 'Completed' },
    { value: 3, label: 'Canceled' },
    { value: 4, label: 'Rescheduled' },
    { value: 5, label: 'Pending' },
    { value: 6, label: 'NoShow' },
    { value: 7, label: 'InCompleteInterview' },
    { value: 8, label: 'UnProcessedProfile' },
    { value: 9, label: 'ClosedInterview' },
    { value: 10, label: 'IsInprogress' },
    { value: 11, label: 'PartiallyCompleted' }
  ];

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
    if (this.isFilterApplied) {
      this.searchSchedules();
      return;
    }

    this.loadInterviewSchedules(this.currentPage());
  }

  protected searchSchedules(): void {
    const payload = this.buildSearchPayload();

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.httpClient.post<InterviewSchedulesApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/SearchInterviewSchedules`, payload).subscribe({
      next: (response) => {
        const results = this.extractSchedules(response);
        this.schedules.set(results);
        this.loadCustomerNamesForSchedules(results);
        this.totalCount.set(results.length);
        this.currentPage.set(0);
        this.totalPages.set(results.length > 0 ? 1 : 0);
        this.isFilterApplied = true;
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.resolveErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  protected clearFilters(): void {
    this.customerNameFilter = '';
    this.scheduleDateFilter = '';
    this.scheduleTimeFilter = '';
    this.statusFilter = '';
    this.isFilterApplied = false;

    this.loadInterviewSchedules(0);
  }

  protected editSchedule(schedule: InterviewScheduleItem): void {
    this.router.navigate(['/interview-schedules/edit'], {
      state: { schedule }
    });
  }

  protected getCustomerName(userId: number | undefined): string {
    if (typeof userId !== 'number') {
      return '';
    }

    return this.customerNameByUserId()[userId] ?? '';
  }

  protected getStatusLabel(status: number | undefined): string {
    if (typeof status !== 'number') {
      return '-';
    }

    return this.statusOptions.find((option) => option.value === status)?.label ?? status.toString();
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
          const schedules = this.extractSchedules(response);

          this.schedules.set(schedules);
          this.loadCustomerNamesForSchedules(schedules);
          this.totalCount.set(pageData?.totalCount ?? 0);
          this.pageSize.set(pageData?.pageSize ?? this.defaultPageSize);
          this.currentPage.set(pageData?.currentPage ?? pageIndex);
          this.totalPages.set(pageData?.totalPages ?? 0);
          this.isFilterApplied = false;
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  private buildSearchPayload(): SearchInterviewSchedulesRequest {
    const payload: SearchInterviewSchedulesRequest = {
      customerName: this.toSingleOrMultiValue(this.customerNameFilter) ?? '',
      status: this.statusFilter
    };

    const scheduleDateValues = this.toSingleOrMultiValue(this.scheduleDateFilter, true);
    if (scheduleDateValues !== undefined) {
      payload.scheduleDate = scheduleDateValues;
    }

    const scheduleTimeValues = this.toSingleOrMultiValue(this.scheduleTimeFilter, true);
    if (scheduleTimeValues !== undefined) {
      payload.scheduleTime = scheduleTimeValues;
    }

    return payload;
  }

  private toSingleOrMultiValue(value: string, omitWhenEmpty = false): string | string[] | undefined {
    const normalizedValues = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (normalizedValues.length === 0) {
      return omitWhenEmpty ? undefined : '';
    }

    return normalizedValues.length === 1 ? normalizedValues[0] : normalizedValues;
  }

  private extractSchedules(response: InterviewSchedulesApiResponse): InterviewScheduleItem[] {
    return response.paginationOrder?.orderDto ?? response.orderDto ?? response.interviewSchedules ?? response.interviewSchedule ?? [];
  }

  private loadCustomerNamesForSchedules(schedules: InterviewScheduleItem[]): void {
    const idsToFetch = [...new Set(schedules.map((schedule) => schedule.userId).filter((id): id is number => typeof id === 'number'))]
      .filter((id) => !this.customerNameByUserId()[id]);

    if (idsToFetch.length === 0 || this.customerInfoAccessDenied) {
      return;
    }

    const requests = idsToFetch.map((userId) =>
      this.getCustomerInfo(userId).pipe(
        map((response) => {
          const customerInfo = response.customerBasicInfo;
          const customerName = customerInfo?.customerName?.trim() || '';

          return {
            userId,
            customerName
          };
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            this.customerInfoAccessDenied = true;
          }

          return of({ userId, customerName: '' });
        })
      )
    );

    forkJoin(requests).subscribe((results) => {
      const existing = this.customerNameByUserId();
      const updated: Record<number, string> = { ...existing };

      for (const result of results) {
        updated[result.userId] = result.customerName;
      }

      this.customerNameByUserId.set(updated);
    });
  }

  private getCustomerInfo(userId: number) {
    return this.httpClient.get<CustomerBasicInfoSchema>(`${resolveApiBasePath()}/api/Customer/GetCustomerInfo`, {
      params: { UserId: userId }
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
