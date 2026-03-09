import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { CustomerService } from '../../api/api/customer.service';
import { resolveApiBasePath } from '../../api-base-path';

type ErrorLogItem = {
  id?: number;
  logDate?: string;
  logLevel?: string;
  logger?: string;
  message?: string;
  exception?: string;
  userId?: number;
  customerName?: string | null;
  requestId?: string;
};

type ErrorLogsPagination = {
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
};

type ErrorLogsApiResponse = {
  errorLogListResponses?: {
    pagination?: ErrorLogsPagination;
    errorLogs?: ErrorLogItem[];
  };
  isSuccess?: boolean;
  message?: string | null;
};

type ErrorLogSearchRequest = {
  severity: string | string[];
  keyword: string | string[];
  username: string | string[];
  logDate?: string | string[];
  pageIndex: number;
  pageSize: number;
};

@Component({
  selector: 'app-error-logs-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './error-logs-page.component.html',
  styleUrl: './error-logs-page.component.scss'
})
export class ErrorLogsPageComponent {
  private readonly httpClient = inject(HttpClient);
  private readonly customerService = inject(CustomerService);

  private readonly defaultPageSize = 3;
  private searchApiPageIndexOffset = 0;
  private readonly customerNameByUserId = signal<Record<number, string>>({});

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly errorLogs = signal<ErrorLogItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly isFilterApplied = signal(false);

  protected readonly filters = signal({
    severity: '',
    keyword: '',
    username: '',
    logDate: ''
  });

  protected readonly appliedFilters = signal({
    severity: '',
    keyword: '',
    username: '',
    logDate: ''
  });

  protected readonly appliedFiltersLabel = computed(() => {
    const currentAppliedFilters = this.appliedFilters();
    const selectedFilters = [
      currentAppliedFilters.severity ? `Severity: ${currentAppliedFilters.severity}` : null,
      currentAppliedFilters.keyword ? `Keyword: ${currentAppliedFilters.keyword}` : null,
      currentAppliedFilters.username ? `Username: ${currentAppliedFilters.username}` : null,
      currentAppliedFilters.logDate ? `Log Date: ${new Date(currentAppliedFilters.logDate).toLocaleString()}` : null
    ].filter((item): item is string => item !== null);

    if (selectedFilters.length === 0) {
      return 'Showing all error logs.';
    }

    return `Showing filtered results for ${selectedFilters.join(', ')}.`;
  });

  protected readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  protected readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());
  protected readonly pageLabel = computed(() => {
    if (this.totalPages() === 0) {
      return 'Page 0 of 0';
    }

    return `Page ${this.currentPage() + 1} of ${this.totalPages()}`;
  });

  constructor() {
    this.loadErrorLogs(0);
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) {
      return;
    }

    if (this.isFilterApplied()) {
      this.searchErrorLogs(this.currentPage() - 1);
      return;
    }

    this.loadErrorLogs(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }

    if (this.isFilterApplied()) {
      this.searchErrorLogs(this.currentPage() + 1);
      return;
    }

    this.loadErrorLogs(this.currentPage() + 1);
  }

  protected retry(): void {
    if (this.isFilterApplied()) {
      this.searchErrorLogs(this.currentPage());
      return;
    }

    this.loadErrorLogs(this.currentPage());
  }

  protected applyFilters(): void {
    this.appliedFilters.set({ ...this.filters() });
    this.searchApiPageIndexOffset = 0;
    this.searchErrorLogs(0);
  }


  protected updateSeverity(value: string): void {
    this.filters.update((currentFilters) => ({ ...currentFilters, severity: value }));
  }

  protected updateKeyword(value: string): void {
    this.filters.update((currentFilters) => ({ ...currentFilters, keyword: value }));
  }

  protected updateUsername(value: string): void {
    this.filters.update((currentFilters) => ({ ...currentFilters, username: value }));
  }

  protected updateLogDate(value: string): void {
    this.filters.update((currentFilters) => ({ ...currentFilters, logDate: value }));
  }

  protected clearFilters(): void {
    const resetFilters = {
      severity: '',
      keyword: '',
      username: '',
      logDate: ''
    };

    this.filters.set(resetFilters);
    this.appliedFilters.set(resetFilters);
    this.isFilterApplied.set(false);
    this.searchApiPageIndexOffset = 0;

    this.loadErrorLogs(0);
  }

  private loadErrorLogs(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.httpClient
      .get<ErrorLogsApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/GetAllErrorLogs`, {
        params: {
          pageIndex,
          pageSize: this.pageSize()
        }
      })
      .pipe(
        switchMap((response) => {
          const logs = response.errorLogListResponses?.errorLogs ?? [];

          return this.resolveCustomerNames(logs).pipe(
            map((customerNames) => ({ response, logs, customerNames }))
          );
        })
      )
      .subscribe({
        next: ({ response, logs, customerNames }) => {
          const pageData = response.errorLogListResponses?.pagination;

          this.customerNameByUserId.update((currentNames) => ({
            ...currentNames,
            ...customerNames
          }));

          const resolvedLogs = logs.map((log) => ({
            ...log,
            customerName:
              log.userId !== undefined && log.userId !== null
                ? customerNames[log.userId] ?? log.customerName
                : log.customerName
          }));

          this.errorLogs.set(resolvedLogs);
          this.totalCount.set(pageData?.totalCount ?? resolvedLogs.length);
          this.pageSize.set(pageData?.pageSize ?? this.defaultPageSize);
          this.currentPage.set(pageData?.currentPage ?? pageIndex);
          this.totalPages.set(pageData?.totalPages ?? 0);
          this.isFilterApplied.set(false);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  private searchErrorLogs(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const searchPayload = this.buildSearchPayload(pageIndex);

    this.httpClient
      .post<ErrorLogsApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/ErrorLogs/Search`, searchPayload)
      .pipe(
        switchMap((response) => {
          const logs = response.errorLogListResponses?.errorLogs ?? [];

          return this.resolveCustomerNames(logs).pipe(
            map((customerNames) => ({ response, logs, customerNames }))
          );
        })
      )
      .subscribe({
        next: ({ response, logs, customerNames }) => {
          const pageData = response.errorLogListResponses?.pagination;

          this.customerNameByUserId.update((currentNames) => ({
            ...currentNames,
            ...customerNames
          }));

          const resolvedLogs = logs.map((log) => ({
            ...log,
            customerName:
              log.userId !== undefined && log.userId !== null
                ? customerNames[log.userId] ?? log.customerName
                : log.customerName
          }));

          const totalPages = pageData?.totalPages ?? (resolvedLogs.length > 0 ? 1 : 0);

          this.updateSearchApiPageIndexOffset(pageData?.currentPage, pageIndex);
          const currentPage = this.resolveCurrentPage(pageData?.currentPage, pageIndex, totalPages);

          this.errorLogs.set(resolvedLogs);
          this.totalCount.set(pageData?.totalCount ?? resolvedLogs.length);
          this.pageSize.set(pageData?.pageSize ?? this.pageSize());
          this.currentPage.set(currentPage);
          this.totalPages.set(totalPages);
          this.isFilterApplied.set(this.hasActiveFilters());
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.isLoading.set(false);
        }
      });
  }

  private buildSearchPayload(pageIndex: number): ErrorLogSearchRequest {
    const activeFilters = this.appliedFilters();

    const searchPayload: ErrorLogSearchRequest = {
      severity: this.toSingleOrMultiValue(activeFilters.severity) ?? '',
      keyword: this.toSingleOrMultiValue(activeFilters.keyword) ?? '',
      username: this.toSingleOrMultiValue(activeFilters.username) ?? '',
      pageIndex: pageIndex + this.searchApiPageIndexOffset,
      pageSize: this.pageSize()
    };

    const logDateValue = this.toSingleOrMultiValue(activeFilters.logDate, true);
    if (logDateValue !== undefined) {
      searchPayload.logDate = this.toIsoDateOrDates(logDateValue);
    }

    return searchPayload;
  }

  private toSingleOrMultiValue(value: unknown, omitWhenEmpty = false): string | string[] | undefined {
    const normalized = this.normalizeText(value)
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (normalized.length === 0) {
      return omitWhenEmpty ? undefined : '';
    }

    return normalized.length === 1 ? normalized[0] : normalized;
  }

  private normalizeText(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number') {
      return value.toString().trim();
    }

    return '';
  }

  private toIsoDateOrDates(value: string | string[]): string | string[] {
    if (Array.isArray(value)) {
      return value.map((dateValue) => new Date(dateValue).toISOString());
    }

    return new Date(value).toISOString();
  }

  private hasActiveFilters(): boolean {
    const activeFilters = this.appliedFilters();

    return [activeFilters.severity, activeFilters.keyword, activeFilters.username, activeFilters.logDate].some(
      (value) => value.trim().length > 0
    );
  }

  private updateSearchApiPageIndexOffset(currentPage: number | undefined, requestedPageIndex: number): void {
    if (typeof currentPage !== 'number') {
      return;
    }

    if (currentPage === requestedPageIndex + 1) {
      this.searchApiPageIndexOffset = 1;
      return;
    }

    if (currentPage === requestedPageIndex) {
      this.searchApiPageIndexOffset = 0;
    }
  }

  private resolveCurrentPage(currentPageFromApi: number | undefined, requestedPageIndex: number, totalPages: number): number {
    if (typeof currentPageFromApi !== 'number') {
      return requestedPageIndex;
    }

    const normalizedPage = currentPageFromApi - this.searchApiPageIndexOffset;

    if (!Number.isFinite(normalizedPage)) {
      return requestedPageIndex;
    }

    if (totalPages <= 0) {
      return 0;
    }

    return Math.min(Math.max(Math.trunc(normalizedPage), 0), totalPages - 1);
  }

  private resolveCustomerNames(logs: ErrorLogItem[]) {
    const uniqueUserIds = [...new Set(logs.map((log) => log.userId).filter((id): id is number => typeof id === 'number'))];

    if (uniqueUserIds.length === 0) {
      return of({} as Record<number, string>);
    }

    const cachedNames = this.customerNameByUserId();
    const missingUserIds = uniqueUserIds.filter((userId) => !(userId in cachedNames));

    if (missingUserIds.length === 0) {
      return of(cachedNames);
    }

    return forkJoin(
      missingUserIds.map((userId) =>
        this.customerService.apiCustomerGetCustomerInfoGet(userId).pipe(
          map((response) => ({ userId, customerName: response.customerBasicInfo?.customerName?.trim() || '-' })),
          catchError(() => of({ userId, customerName: '-' }))
        )
      )
    ).pipe(
      map((results) =>
        results.reduce<Record<number, string>>((accumulator, result) => {
          accumulator[result.userId] = result.customerName;
          return accumulator;
        }, { ...cachedNames })
      )
    );
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    const apiMessage = error.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
      return apiMessage;
    }

    if (error.status === 0) {
      return 'Unable to connect to the server. Please check your network and API availability.';
    }

    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error;
    }

    return `Failed to load error logs (HTTP ${error.status || 'unknown'}).`;
  }
}
