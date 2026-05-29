import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type SignupStats = {
  totalUsers?: number;
  todaySignups?: number;
  weekSignups?: number;
  monthSignups?: number;
  activeUsers?: number;
  inactiveUsers?: number;
  verifiedUsers?: number;
  experiencedUsers?: number;
  fresherUsers?: number;
};

type SignupStatsResponse = {
  isSuccess?: boolean;
  stats?: SignupStats;
};

type StatCard = { label: string; value: number; color: string; bg: string; icon: string };

@Component({
  selector: 'app-user-analytics-dashboard-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './user-analytics-dashboard-page.component.html',
  styleUrl: './user-analytics-dashboard-page.component.scss',
})
export class UserAnalyticsDashboardPageComponent {
  private readonly http = inject(HttpClient);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly stats = signal<SignupStats>({});

  protected readonly statCards = computed<StatCard[]>(() => {
    const s = this.stats();
    return [
      { label: 'Total Users',    value: s.totalUsers       ?? 0, color: '#1d4ed8', bg: '#dbeafe', icon: '👥' },
      { label: 'Today Signups',  value: s.todaySignups     ?? 0, color: '#065f46', bg: '#d1fae5', icon: '🆕' },
      { label: 'Week Signups',   value: s.weekSignups      ?? 0, color: '#6d28d9', bg: '#ede9fe', icon: '📅' },
      { label: 'Month Signups',  value: s.monthSignups     ?? 0, color: '#0369a1', bg: '#e0f2fe', icon: '📆' },
      { label: 'Active Users',   value: s.activeUsers      ?? 0, color: '#065f46', bg: '#d1fae5', icon: '✅' },
      { label: 'Verified Users', value: s.verifiedUsers    ?? 0, color: '#1d4ed8', bg: '#dbeafe', icon: '🔵' },
      { label: 'Experienced',    value: s.experiencedUsers ?? 0, color: '#7c3aed', bg: '#ede9fe', icon: '💼' },
      { label: 'Freshers',       value: s.fresherUsers     ?? 0, color: '#0d9488', bg: '#ccfbf1', icon: '🌱' },
    ];
  });

  constructor() {
    this.loadStats();
  }

  protected retryStats(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http
      .get<SignupStatsResponse>(`${resolveApiBasePath()}/api/SuperAdmin/GetSignupStats`)
      .subscribe({
        next: (res) => {
          this.stats.set(res.stats ?? {});
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
      return 'You are not authorized. Please sign in again.';
    }
    if (err.status === 404) {
      return 'API endpoint not found. Please check configuration.';
    }
    if (typeof err.error === 'object' && err.error !== null && 'message' in err.error) {
      const msg = (err.error as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim().length > 0) return msg;
    }
    return 'Unable to load data. Please try again.';
  }
}
