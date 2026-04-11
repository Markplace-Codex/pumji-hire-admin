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

type JsonDataFilters = {
  fromDate: string;
  toDate: string;
  purpose: string;
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

  protected readonly filters = signal<JsonDataFilters>({
    fromDate: '',
    toDate: '',
    purpose: ''
  });

  protected readonly appliedFilters = signal<JsonDataFilters>({
    fromDate: '',
    toDate: '',
    purpose: ''
  });

  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);
  protected readonly totalCount = signal(0);
  protected readonly totalPages = signal(0);

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
    this.loadJsonDatas();
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) {
      return;
    }

    this.currentPage.set(this.currentPage() - 1);
    this.loadJsonDatas();
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }

    this.currentPage.set(this.currentPage() + 1);
    this.loadJsonDatas();
  }

  protected retry(): void {
    this.loadJsonDatas();
  }

  protected applyFilters(): void {
    this.appliedFilters.set({ ...this.filters() });
    this.currentPage.set(0);
    this.loadJsonDatas();
  }

  protected clearFilters(): void {
    const emptyFilters: JsonDataFilters = {
      fromDate: '',
      toDate: '',
      purpose: ''
    };

    this.filters.set(emptyFilters);
    this.appliedFilters.set(emptyFilters);
    this.currentPage.set(0);
    this.loadJsonDatas();
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

  protected resolveJsonContent(item: JsonDataItem): string {
    const value = item.jsonContent ?? item.formattedJsonContent ?? '';

    if (value.trim().length === 0) {
      return '-';
    }

    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  private loadJsonDatas(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.fetchJsonDataPage(this.currentPage()).subscribe({
      next: (response) => {
        if (response.isSuccess === false) {
          this.errorMessage.set(response.message?.trim() || 'Failed to load json data list.');
          this.jsonDatas.set([]);
          this.totalCount.set(0);
          this.totalPages.set(0);
          this.isLoading.set(false);
          return;
        }

        this.jsonDatas.set(response.paginationJsonData?.jsonDataList ?? []);
        this.totalCount.set(response.paginationJsonData?.pagination?.totalCount ?? 0);
        this.totalPages.set(response.paginationJsonData?.pagination?.totalPages ?? 0);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse | Error) => {
        this.errorMessage.set(this.resolveErrorMessage(error));
        this.jsonDatas.set([]);
        this.totalCount.set(0);
        this.totalPages.set(0);
        this.isLoading.set(false);
      }
    });
  }

  private fetchJsonDataPage(pageIndex: number) {
    const activeFilters = this.appliedFilters();
    let params = new HttpParams().set('pageIndex', pageIndex).set('pageSize', this.pageSize());

    if (activeFilters.purpose.trim().length > 0) {
      params = params.set('purpose', activeFilters.purpose.trim());
    }

    if (activeFilters.fromDate.trim().length > 0) {
      params = params.set('fromDate', new Date(activeFilters.fromDate).toISOString());
    }

    if (activeFilters.toDate.trim().length > 0) {
      params = params.set('toDate', new Date(activeFilters.toDate).toISOString());
    }

    return this.httpClient.get<JsonDataApiResponse>(`${resolveApiBasePath()}/api/JsonData/JsonDataList`, { params });
  }

  private resolveErrorMessage(error: HttpErrorResponse | Error): string {
    if (error instanceof HttpErrorResponse) {
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

    return error.message;
  }
}
