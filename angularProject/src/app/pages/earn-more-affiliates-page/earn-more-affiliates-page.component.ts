import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type AffiliateItem = {
  id?: number;
  userId?: number;
  name?: string | null;
  status?: string | null;
  commissionPercentage?: number;
  commisionDuration?: string | null;
  affiliateURL?: string | null;
  createdAt?: string;
};

type ApiResponse = {
  paginationAffiliate?: {
    pagination?: { totalCount?: number; totalPages?: number; currentPage?: number; pageSize?: number };
    affiliateAdminLists?: AffiliateItem[] | null;
  };
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-earn-more-affiliates-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './earn-more-affiliates-page.component.html',
  styleUrl: './earn-more-affiliates-page.component.scss',
})
export class EarnMoreAffiliatesPageComponent {
  private readonly http = inject(HttpClient);
  private readonly pageSize = 10;

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly affiliates = signal<AffiliateItem[]>([]);
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
    if (s.includes('active') || s.includes('approved') || s.includes('accept')) return 'badge-green';
    if (s.includes('pending') || s.includes('review') || s.includes('underreview')) return 'badge-yellow';
    if (s.includes('reject') || s.includes('suspend') || s.includes('cancel')) return 'badge-red';
    return 'badge-gray';
  }

  private load(pageIndex: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.get<ApiResponse>(
      `${resolveApiBasePath()}/api/SuperAdmin/GetAllAffiliateRequests`,
      { params: { pageIndex, pageSize: this.pageSize } }
    ).subscribe({
      next: (res) => {
        const pagination = res.paginationAffiliate?.pagination;
        const list = res.paginationAffiliate?.affiliateAdminLists ?? [];
        this.affiliates.set(list);
        this.currentPage.set(pagination?.currentPage ?? pageIndex);
        this.totalCount.set(pagination?.totalCount ?? 0);
        this.totalPages.set(pagination?.totalPages ?? 0);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(this.resolveError(err));
        this.affiliates.set([]);
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
