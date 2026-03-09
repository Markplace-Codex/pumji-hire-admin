import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type AffiliateCommissionPayload = {
  id: number;
  name: string;
  earningAmount: number;
};

type AffiliateCommissionByIdResponse = {
  affiliateCommission?: {
    id?: number;
    name?: string | null;
    earningAmount?: number;
  };
  isSuccess?: boolean;
  message?: string | null;
};

type AffiliateCommissionSubmitResponse = {
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-affiliate-commission-form-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './affiliate-commission-form-page.component.html',
  styleUrl: './affiliate-commission-form-page.component.scss'
})
export class AffiliateCommissionFormPageComponent implements OnInit {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isEditMode = computed(
    () => this.route.snapshot.routeConfig?.path === 'configuration/affiliate-commission/edit/:id'
  );

  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal<string | null>(null);

  protected formModel: AffiliateCommissionPayload = {
    id: 0,
    name: '',
    earningAmount: 0
  };

  ngOnInit(): void {
    if (!this.isEditMode()) {
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.submitError.set('Invalid affiliate commission id for edit.');
      return;
    }

    this.isLoading.set(true);

    this.httpClient
      .get<AffiliateCommissionByIdResponse>(
        `${resolveApiBasePath()}/api/AffiliateCommission/GetAffiliateCommissionById?id=${id}`
      )
      .subscribe({
        next: (response) => {
          const affiliateCommission = response.affiliateCommission;

          if (!affiliateCommission) {
            this.submitError.set(this.sanitizeMessage(response.message) || 'Unable to load affiliate commission details.');
            this.isLoading.set(false);
            return;
          }

          this.formModel = {
            id: affiliateCommission.id ?? id,
            name: affiliateCommission.name ?? '',
            earningAmount: affiliateCommission.earningAmount ?? 0
          };
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(this.resolveErrorMessage(error, 'Unable to load affiliate commission details.'));
          this.isLoading.set(false);
        }
      });
  }

  protected submitForm(): void {
    this.submitError.set(null);
    this.submitSuccess.set(null);
    this.isSubmitting.set(true);

    const payload: AffiliateCommissionPayload = {
      id: this.isEditMode() ? this.formModel.id : 0,
      name: this.formModel.name.trim(),
      earningAmount: this.formModel.earningAmount
    };

    const request$ = this.isEditMode()
      ? this.httpClient.put<AffiliateCommissionSubmitResponse>(
          `${resolveApiBasePath()}/api/AffiliateCommission/UpdateAffiliateCommission`,
          payload
        )
      : this.httpClient.post<AffiliateCommissionSubmitResponse>(
          `${resolveApiBasePath()}/api/AffiliateCommission/CreateAffiliateCommission`,
          payload
        );

    request$.subscribe({
      next: (response) => {
        if (response.isSuccess === false) {
          this.submitError.set(this.sanitizeMessage(response.message) || this.defaultErrorMessage());
          this.isSubmitting.set(false);
          return;
        }

        this.submitSuccess.set(
          this.isEditMode()
            ? 'Affiliate commission updated successfully.'
            : 'Affiliate commission created successfully.'
        );
        this.isSubmitting.set(false);

        setTimeout(() => {
          this.router.navigate(['/configuration/affiliate-commission']);
        }, 600);
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(this.resolveErrorMessage(error, this.defaultErrorMessage()));
        this.isSubmitting.set(false);
      }
    });
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallbackMessage: string): string {
    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      const sanitizedMessage = this.sanitizeMessage(message);
      if (sanitizedMessage) {
        return sanitizedMessage;
      }
    }

    return fallbackMessage;
  }

  private sanitizeMessage(message: unknown): string | null {
    if (typeof message !== 'string') {
      return null;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return null;
    }

    const normalizedMessage = trimmedMessage.toLowerCase();
    if (normalizedMessage.includes('/api/') || normalizedMessage.includes('endpoint')) {
      return null;
    }

    return trimmedMessage;
  }

  private defaultErrorMessage(): string {
    return this.isEditMode()
      ? 'Unable to update affiliate commission right now.'
      : 'Unable to create affiliate commission right now.';
  }
}
