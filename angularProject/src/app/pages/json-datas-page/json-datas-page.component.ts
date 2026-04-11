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
    id: '',
    purpose: '',
    createdTime: '',
    keyword: ''
  });

  protected readonly appliedFilters = signal({
    id: '',
    purpose: '',
    createdTime: '',
    keyword: ''
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
      id: '',
      purpose: '',
      createdTime: '',
      keyword: ''
    };

    this.filters.set(emptyFilters);
    this.appliedFilters.set(emptyFilters);
    this.loadJsonDatas(0);
  }

  protected updateId(value: string): void {
    this.filters.update((current) => ({ ...current, id: value }));
  }

  protected updatePurpose(value: string): void {
    this.filters.update((current) => ({ ...current, purpose: value }));
  }

  protected updateCreatedTime(value: string): void {
    this.filters.update((current) => ({ ...current, createdTime: value }));
  }

  protected updateKeyword(value: string): void {
    this.filters.update((current) => ({ ...current, keyword: value }));
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

    let params = new HttpParams()
      .set('pageIndex', pageIndex)
      .set('pageSize', this.defaultPageSize);

    const activeFilters = this.appliedFilters();

    if (activeFilters.id.trim().length > 0) {
      params = params.set('id', activeFilters.id.trim());
    }

    if (activeFilters.purpose.trim().length > 0) {
      params = params.set('purpose', activeFilters.purpose.trim());
    }

    if (activeFilters.createdTime.trim().length > 0) {
      params = params.set('createdTime', activeFilters.createdTime.trim());
    }

    if (activeFilters.keyword.trim().length > 0) {
      params = params.set('keyword', activeFilters.keyword.trim());
    }

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

          const jsonDataList = response.paginationJsonData?.jsonDataList ?? [];
          const pagination = response.paginationJsonData?.pagination;

          this.jsonDatas.set(jsonDataList);
          this.totalCount.set(pagination?.totalCount ?? jsonDataList.length);
          this.pageSize.set(pagination?.pageSize ?? this.defaultPageSize);
          this.currentPage.set(pagination?.currentPage ?? pageIndex);
          this.totalPages.set(pagination?.totalPages ?? 0);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.isLoading.set(false);
        }
      });
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
