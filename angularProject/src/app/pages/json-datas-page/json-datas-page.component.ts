import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';

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
  private readonly apiPageSize = 100;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly allJsonDatas = signal<JsonDataItem[]>([]);

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

  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);

  protected readonly isFilterApplied = computed(() => {
    const activeFilters = this.appliedFilters();
    return Object.values(activeFilters).some((value) => value.trim().length > 0);
  });

  protected readonly filteredJsonDatas = computed(() => {
    const activeFilters = this.appliedFilters();
    const idFilter = activeFilters.id.trim();
    const purposeFilter = activeFilters.purpose.trim().toLowerCase();
    const createdTimeFilter = activeFilters.createdTime.trim().toLowerCase();
    const keywordFilter = activeFilters.keyword.trim().toLowerCase();

    return this.allJsonDatas().filter((item) => {
      if (idFilter.length > 0 && String(item.id ?? '').trim() !== idFilter) {
        return false;
      }

      if (purposeFilter.length > 0 && !(item.purpose ?? '').toLowerCase().includes(purposeFilter)) {
        return false;
      }

      if (createdTimeFilter.length > 0 && !(item.createdTime ?? '').toLowerCase().includes(createdTimeFilter)) {
        return false;
      }

      if (keywordFilter.length > 0) {
        const jsonContent = (item.jsonContent ?? '').toLowerCase();
        const formattedJsonContent = (item.formattedJsonContent ?? '').toLowerCase();

        if (!jsonContent.includes(keywordFilter) && !formattedJsonContent.includes(keywordFilter)) {
          return false;
        }
      }

      return true;
    });
  });

  protected readonly totalCount = computed(() => this.filteredJsonDatas().length);
  protected readonly totalPages = computed(() => {
    const totalCount = this.totalCount();
    if (totalCount === 0) {
      return 0;
    }

    return Math.ceil(totalCount / this.pageSize());
  });

  protected readonly jsonDatas = computed(() => {
    const startIndex = this.currentPage() * this.pageSize();
    return this.filteredJsonDatas().slice(startIndex, startIndex + this.pageSize());
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
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) {
      return;
    }

    this.currentPage.set(this.currentPage() + 1);
  }

  protected retry(): void {
    this.loadJsonDatas();
  }

  protected applyFilters(): void {
    this.appliedFilters.set({ ...this.filters() });
    this.currentPage.set(0);
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
    this.currentPage.set(0);
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

  private loadJsonDatas(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.fetchJsonDataPage(0)
      .pipe(
        switchMap((firstResponse) => {
          if (firstResponse.isSuccess === false) {
            throw new Error(firstResponse.message?.trim() || 'Failed to load json data list.');
          }

          const firstPageItems = firstResponse.paginationJsonData?.jsonDataList ?? [];
          const totalPages = firstResponse.paginationJsonData?.pagination?.totalPages ?? 0;

          if (totalPages <= 1) {
            return of(firstPageItems);
          }

          const remainingRequests = Array.from({ length: totalPages - 1 }, (_, index) =>
            this.fetchJsonDataPage(index + 1)
          );

          return forkJoin(remainingRequests).pipe(
            map((remainingResponses) => {
              const remainingItems = remainingResponses.flatMap((response) => response.paginationJsonData?.jsonDataList ?? []);
              return [...firstPageItems, ...remainingItems];
            })
          );
        })
      )
      .subscribe({
        next: (items) => {
          this.allJsonDatas.set(items);
          this.currentPage.set(0);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse | Error) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.allJsonDatas.set([]);
          this.currentPage.set(0);
          this.isLoading.set(false);
        }
      });
  }

  private fetchJsonDataPage(pageIndex: number) {
    const params = new HttpParams().set('pageIndex', pageIndex).set('pageSize', this.apiPageSize);

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
