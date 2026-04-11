import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type JsonDataItem = {
  id?: number;
  createdTime?: string;
  jsonContent?: string;
  formattedJsonContent?: string;
  purpose?: string | null;
};

type JsonDataPagination = {
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
};

type JsonDataApiResponse = {
  paginationJsonData?: {
    pagination?: JsonDataPagination;
    jsonDataList?: JsonDataItem[];
  };
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-json-datas-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './json-datas-page.component.html',
  styleUrl: './json-datas-page.component.scss'
})
export class JsonDatasPageComponent {
  private readonly httpClient = inject(HttpClient);
  private readonly defaultPageSize = 10;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly jsonDatas = signal<JsonDataItem[]>([]);

  protected readonly totalCount = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);

  protected readonly filters = signal({
    fromDate: '',
    toDate: '',
    purpose: ''
  });

  protected readonly appliedFilters = signal({
    fromDate: '',
    toDate: '',
    purpose: ''
  });

  protected readonly isFilterApplied = computed(() => {
    const activeFilters = this.appliedFilters();
    return Object.values(activeFilters).some((value) => value.trim().length > 0);
  });

  protected readonly pageLabel = computed(() =>
    this.totalPages() === 0 ? 'Page 0 of 0' : `Page ${this.currentPage() + 1} of ${this.totalPages()}`
  );

  protected readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  protected readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());

  constructor() {
    this.loadJsonDatas(0);
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) {
      return;
    }

    this.loadJsonDatas(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }

    this.loadJsonDatas(this.currentPage() + 1);
  }

  protected retry(): void {
    this.loadJsonDatas(this.currentPage());
  }

  protected applyFilters(): void {
    this.appliedFilters.set({ ...this.filters() });
    this.loadJsonDatas(0);
  }

  protected clearFilters(): void {
    const emptyFilters = {
      fromDate: '',
      toDate: '',
      purpose: ''
    };

    this.filters.set(emptyFilters);
    this.appliedFilters.set(emptyFilters);
    this.loadJsonDatas(0);
  }

  protected updateFromDate(value: string): void {
    this.filters.update((current) => ({ ...current, fromDate: value }));
  }

  protected updateToDate(value: string): void {
    this.filters.update((current) => ({ ...current, toDate: value }));
  }

  protected updatePurpose(value: string): void {
    this.filters.update((current) => ({ ...current, purpose: value }));
  }

  protected resolveFormattedJson(item: JsonDataItem): string {
    const candidates = [item.formattedJsonContent, item.jsonContent];

    for (const value of candidates) {
      if (!value || value.trim().length === 0) {
        continue;
      }

      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }

    return '-';
  }

  private loadJsonDatas(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const params = this.buildQueryParams(pageIndex);

    this.httpClient
      .get<JsonDataApiResponse>(`${resolveApiBasePath()}/api/JsonData/JsonDataList`, { params })
      .subscribe({
        next: (response) => {
          if (response.isSuccess === false) {
            this.errorMessage.set(response.message?.trim() || 'Failed to load json data list.');
            this.jsonDatas.set([]);
            this.totalCount.set(0);
            this.currentPage.set(pageIndex);
            this.totalPages.set(0);
            this.isLoading.set(false);
            return;
          }

          const pageData = response.paginationJsonData?.pagination;
          const jsonDataList = response.paginationJsonData?.jsonDataList ?? [];

          this.jsonDatas.set(jsonDataList);
          this.totalCount.set(pageData?.totalCount ?? jsonDataList.length);
          this.pageSize.set(pageData?.pageSize ?? this.defaultPageSize);
          this.currentPage.set(pageData?.currentPage ?? pageIndex);
          this.totalPages.set(pageData?.totalPages ?? 0);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.jsonDatas.set([]);
          this.totalCount.set(0);
          this.currentPage.set(pageIndex);
          this.totalPages.set(0);
          this.isLoading.set(false);
        }
      });
  }

  private buildQueryParams(pageIndex: number): HttpParams {
    const activeFilters = this.appliedFilters();

    let params = new HttpParams().set('pageIndex', pageIndex).set('pageSize', this.pageSize());

    if (activeFilters.purpose.trim().length > 0) {
      params = params.set('purpose', activeFilters.purpose.trim());
    }

    const fromDateIso = this.toIsoString(activeFilters.fromDate);
    if (fromDateIso) {
      params = params.set('fromDate', fromDateIso);
    }

    const toDateIso = this.toIsoString(activeFilters.toDate);
    if (toDateIso) {
      params = params.set('toDate', toDateIso);
    }

    return params;
  }

  private toIsoString(value: string): string | null {
    if (!value || value.trim().length === 0) {
      return null;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate.toISOString();
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

    return `Failed to load json data list (HTTP ${error.status || 'unknown'}).`;
  }
}
