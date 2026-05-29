import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type UserDetail = {
  id?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  city?: string;
  countryId?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isExperienced?: boolean;
  isFresher?: boolean;
  createdOn?: string;
};

type UserDetailResponse = {
  isSuccess?: boolean;
  user?: UserDetail;
};

@Component({
  selector: 'app-user-detail-page',
  imports: [RouterLink],
  templateUrl: './user-detail-page.component.html',
  styleUrl: './user-detail-page.component.scss',
})
export class UserDetailPageComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  protected readonly userId: number;
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly user = signal<UserDetail | null>(null);

  constructor() {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadUser();
  }

  protected retry(): void {
    this.loadUser();
  }

  protected getFullName(u: UserDetail): string {
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username || 'User';
  }

  protected getUserType(u: UserDetail): string {
    if (u.isExperienced) return 'Experienced';
    if (u.isFresher) return 'Fresher';
    return 'N/A';
  }

  private loadUser(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http
      .get<UserDetailResponse>(
        `${resolveApiBasePath()}/api/SuperAdmin/GetUserById/${this.userId}`
      )
      .subscribe({
        next: (res) => {
          this.user.set(res.user ?? null);
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
      return 'You are not authorized to view this user. Please sign in again.';
    }
    if (err.status === 404) {
      return 'User not found.';
    }
    if (typeof err.error === 'object' && err.error !== null && 'message' in err.error) {
      const msg = (err.error as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim().length > 0) return msg;
    }
    return 'Unable to load user details. Please try again.';
  }
}
