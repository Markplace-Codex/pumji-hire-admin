import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type ContractItem = {
  id?: number;
  userId?: number;
  name?: string | null;
  worktype?: string | null;
  companyTypePref?: string | null;
  weeklyBasis?: number;
  monthlyBasis?: number;
  sixMonths?: number;
  year?: number;
  status?: string | null;
  createdAt?: string;
};

type ApiResponse = {
  contractListResponses?: {
    pagination?: { totalCount?: number; totalPages?: number; currentPage?: number; pageSize?: number };
    contractorsList?: ContractItem[] | null;
  };
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-earn-more-freelancing-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './earn-more-freelancing-page.component.html',
  styleUrl: './earn-more-freelancing-page.component.scss',
})
export class EarnMoreFreelancingPageComponent {
  private readonly http = inject(HttpClient);
  private readonly pageSize = 10;

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly contracts = signal<ContractItem[]>([]);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalCount = signal(0);

  protected readonly pageLabel = computed(() =>
    this.totalPages() === 0 ? 'Page 0 of 0' : `Page ${this.currentPage() + 1} of ${this.totalPages()}`
  );
  protected readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  protected readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());

  constructor() {
    this.load(0);
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) return;
    this.load(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) return;
    this.load(this.currentPage() + 1);
  }

  protected retry(): void {
    this.load(this.currentPage());
  }

  protected statusClass(status: string | null | undefined): string {
    const s = (status ?? '').toLowerCase();
    if (s.includes('active') || s.includes('approved') || s.includes('completed')) return 'badge-green';
    if (s.includes('pending') || s.includes('review') || s.includes('underreview')) return 'badge-yellow';
    if (s.includes('cancel') || s.includes('reject') || s.includes('closed')) return 'badge-red';
    return 'badge-gray';
  }

  private load(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.get<ApiResponse>(
      `${resolveApiBasePath()}/api/SuperAdmin/GetAllContractRequests`,
      { params: { pageIndex, pageSize: this.pageSize } }
    ).subscribe({
      next: (res) => {
        if (res.isSuccess === false) {
          this.errorMessage.set(res.message?.trim() || 'Failed to load contract requests.');
          this.contracts.set([]);
          this.isLoading.set(false);
          return;
        }
        const pagination = res.contractListResponses?.pagination;
        this.contracts.set(res.contractListResponses?.contractorsList ?? []);
        this.currentPage.set(pagination?.currentPage ?? pageIndex);
        this.totalCount.set(pagination?.totalCount ?? 0);
        this.totalPages.set(pagination?.totalPages ?? 0);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(this.resolveError(err));
        this.contracts.set([]);
        this.isLoading.set(false);
      }
    });
  }

  private resolveError(err: HttpErrorResponse): string {
    const msg = err.error?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    if (err.status === 0) return 'Unable to connect to the server. Please check your network.';
    return `Failed to load data (HTTP ${err.status || 'unknown'}).`;
  }
}
