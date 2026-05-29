import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type UserListItem = {
  id?: number;
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  isActive?: boolean;
  isVerified?: boolean;
  userType?: string;
  createdOn?: string;
};

type PaginationDetails = {
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
};

type UsersApiResponse = {
  isSuccess?: boolean;
  users?: {
    pagination?: PaginationDetails;
    userList?: UserListItem[];
  };
};

@Component({
  selector: 'app-users-list-page',
  imports: [RouterLink],
  templateUrl: './users-list-page.component.html',
  styleUrl: './users-list-page.component.scss',
})
export class UsersListPageComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly defaultPageSize = 20;

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly users = signal<UserListItem[]>([]);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalCount = signal(0);
  protected readonly pageSize = signal(this.defaultPageSize);

  protected readonly search = signal('');
  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');
  protected readonly isActive = signal('');
  protected readonly isVerified = signal('');
  protected readonly userType = signal('');

  protected readonly pageSizeOptions = [10, 20, 50];

  protected readonly hasPreviousPage = computed(() => this.currentPage() > 0);
  protected readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());
  protected readonly pageLabel = computed(() => {
    if (this.totalPages() === 0) return 'Page 0 of 0';
    return `Page ${this.currentPage() + 1} of ${this.totalPages()}`;
  });

  constructor() {
    this.loadUsers(0);
  }

  protected applyFilters(): void {
    this.loadUsers(0);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.isActive.set('');
    this.isVerified.set('');
    this.userType.set('');
    this.loadUsers(0);
  }

  protected refresh(): void {
    this.loadUsers(this.currentPage());
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage() || this.isLoading()) return;
    this.loadUsers(this.currentPage() - 1);
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage() || this.isLoading()) return;
    this.loadUsers(this.currentPage() + 1);
  }

  protected updatePageSize(rawValue: string): void {
    const size = Number(rawValue);
    if (!isNaN(size) && size > 0) {
      this.pageSize.set(size);
      this.loadUsers(0);
    }
  }

  protected updateSearch(value: string): void {
    this.search.set(value);
  }

  protected updateFromDate(value: string): void {
    this.fromDate.set(value);
  }

  protected updateToDate(value: string): void {
    this.toDate.set(value);
  }

  protected updateIsActive(value: string): void {
    this.isActive.set(value);
  }

  protected updateIsVerified(value: string): void {
    this.isVerified.set(value);
  }

  protected updateUserType(value: string): void {
    this.userType.set(value);
  }

  protected viewUser(id: number | undefined): void {
    if (id == null) return;
    this.router.navigate(['/users', id]);
  }

  protected retry(): void {
    this.loadUsers(this.currentPage());
  }

  protected getActiveBadgeClass(isActive: boolean | undefined): string {
    return isActive ? 'badge badge-green' : 'badge badge-red';
  }

  protected getActiveLabel(isActive: boolean | undefined): string {
    return isActive ? 'Active' : 'Inactive';
  }

  protected getVerifiedBadgeClass(isVerified: boolean | undefined): string {
    return isVerified ? 'badge badge-blue' : 'badge badge-orange';
  }

  protected getVerifiedLabel(isVerified: boolean | undefined): string {
    return isVerified ? 'Verified' : 'Unverified';
  }

  protected getUserTypeBadgeClass(userType: string | undefined): string {
    if (userType === 'Experienced') return 'badge badge-purple';
    if (userType === 'Fresher') return 'badge badge-teal';
    return 'badge badge-gray';
  }

  private loadUsers(page: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', this.pageSize());

    const search = this.search().trim();
    const fromDate = this.fromDate().trim();
    const toDate = this.toDate().trim();
    const isActive = this.isActive().trim();
    const isVerified = this.isVerified().trim();
    const userType = this.userType().trim();

    if (search) params = params.set('search', search);
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    if (isActive) params = params.set('isActive', isActive);
    if (isVerified) params = params.set('isVerified', isVerified);
    if (userType) params = params.set('userType', userType);

    this.http
      .get<UsersApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/GetUsers`, { params })
      .subscribe({
        next: (res) => {
          const pagination = res.users?.pagination;
          this.users.set(res.users?.userList ?? []);
          this.totalCount.set(pagination?.totalCount ?? 0);
          this.pageSize.set(pagination?.pageSize ?? this.defaultPageSize);
          this.currentPage.set(pagination?.currentPage ?? page);
          this.totalPages.set(pagination?.totalPages ?? 0);
          this.isLoading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(err));
          this.isLoading.set(false);
        },
      });
  }

  private resolveErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 401 || err.status === 403) {
      return 'You are not authorized to view users. Please sign in again.';
    }
    if (err.status === 404) {
      return 'Users API endpoint not found. Please check configuration.';
    }
    if (typeof err.error === 'object' && err.error !== null && 'message' in err.error) {
      const msg = (err.error as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim().length > 0) return msg;
    }
    return 'Unable to load users. Please try again.';
  }
}
