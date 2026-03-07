import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type AffiliateCommissionItem = {
  id?: number;
  name?: string | null;
  earningAmount?: number;
};

type AffiliateCommissionApiResponse = {
  affiliateCommissions?: AffiliateCommissionItem[];
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-affiliate-commission-page',
  imports: [RouterLink],
  templateUrl: './affiliate-commission-page.component.html',
  styleUrl: './affiliate-commission-page.component.scss'
})
export class AffiliateCommissionPageComponent {
  private readonly httpClient = inject(HttpClient);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly commissions = signal<AffiliateCommissionItem[]>([]);

  constructor() {
    this.loadAffiliateCommissions();
  }

  protected retry(): void {
    this.loadAffiliateCommissions();
  }

  private loadAffiliateCommissions(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.httpClient
      .get<AffiliateCommissionApiResponse>(
        `${resolveApiBasePath()}/api/AffiliateCommission/GetAllAffiliateCommision`
      )
      .subscribe({
        next: (response) => {
          this.commissions.set(response.affiliateCommissions ?? []);
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.resolveErrorMessage(error));
          this.commissions.set([]);
          this.isLoading.set(false);
        }
      });
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    const serverMessage =
      typeof error.error === 'object' && error.error !== null && 'message' in error.error
        ? String(error.error.message)
        : null;

    if (serverMessage && serverMessage.trim().length > 0) {
      return serverMessage;
    }

    return 'Unable to load affiliate commissions. Please try again.';
  }
}
