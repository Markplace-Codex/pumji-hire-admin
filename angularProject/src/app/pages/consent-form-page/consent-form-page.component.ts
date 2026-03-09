import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type ComplianceDocumentDto = {
  id?: number;
  name?: string | null;
  type?: string | null;
  documentVersion?: string | null;
  htmlCode?: string | null;
  isMandatory?: boolean;
  isActive?: boolean;
  isMajorChange?: boolean;
  country?: string | null;
  countryId?: number | null;
  createdByUserId?: number;
  createdAt?: string;
  updatedAt?: string;
};

type ComplianceDocumentResponse = {
  complianceDocumentVersionDto?: ComplianceDocumentDto;
  isSuccess?: boolean;
  message?: string | null;
};

type ComplianceDocumentFormModel = {
  id: number;
  name: string;
  type: string;
  documentVersion: string;
  htmlCode: string;
  isMandatory: boolean;
  isActive: boolean;
  isMajorChange: boolean;
  country: string;
  createdByUserId: number;
};

@Component({
  selector: 'app-consent-form-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './consent-form-page.component.html',
  styleUrl: './consent-form-page.component.scss'
})
export class ConsentFormPageComponent implements OnInit {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isEditMode = computed(() => this.route.snapshot.routeConfig?.path === 'consent/edit/:id');
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal<string | null>(null);

  protected formModel: ComplianceDocumentFormModel = {
    id: 0,
    name: '',
    type: '',
    documentVersion: '',
    htmlCode: '',
    isMandatory: false,
    isActive: true,
    isMajorChange: false,
    country: '',
    createdByUserId: 0
  };

  ngOnInit(): void {
    if (!this.isEditMode()) {
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.submitError.set('Invalid consent id for edit.');
      return;
    }

    this.isLoading.set(true);
    this.httpClient
      .get<ComplianceDocumentResponse>(`${resolveApiBasePath()}/api/ComplianceDocument/GetById`, {
        params: { id }
      })
      .subscribe({
        next: (response) => {
          if (response.isSuccess === false) {
            this.submitError.set(this.sanitizeMessage(response.message) || 'Unable to load consent details.');
            this.isLoading.set(false);
            return;
          }

          const dto = response.complianceDocumentVersionDto;
          if (!dto) {
            this.submitError.set('Unable to load consent details.');
            this.isLoading.set(false);
            return;
          }

          this.formModel = {
            id: dto.id ?? id,
            name: dto.name ?? '',
            type: dto.type ?? '',
            documentVersion: dto.documentVersion ?? '',
            htmlCode: dto.htmlCode ?? '',
            isMandatory: dto.isMandatory ?? false,
            isActive: dto.isActive ?? true,
            isMajorChange: dto.isMajorChange ?? false,
            country: dto.country ?? '',
            createdByUserId: dto.createdByUserId ?? 0
          };
          this.isLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(this.resolveErrorMessage(error, 'Unable to load consent details.'));
          this.isLoading.set(false);
        }
      });
  }

  protected submitForm(): void {
    this.isSubmitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(null);

    const payload = this.buildPayload();
    const endpoint = this.isEditMode() ? '/api/ComplianceDocument/Update' : '/api/ComplianceDocument/Create';
    const method = this.isEditMode() ? 'put' : 'post';

    this.httpClient.request<ComplianceDocumentResponse>(method, `${resolveApiBasePath()}${endpoint}`, { body: payload }).subscribe({
      next: (response) => {
        if (response.isSuccess === false) {
          this.submitError.set(this.sanitizeMessage(response.message) || this.defaultErrorMessage());
          this.isSubmitting.set(false);
          return;
        }

        this.submitSuccess.set(this.isEditMode() ? 'Consent updated successfully.' : 'Consent created successfully.');
        this.isSubmitting.set(false);

        setTimeout(() => {
          this.router.navigate(['/consent']);
        }, 700);
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(this.resolveErrorMessage(error, this.defaultErrorMessage()));
        this.isSubmitting.set(false);
      }
    });
  }

  private buildPayload(): ComplianceDocumentDto {
    const now = new Date().toISOString();

    return {
      id: this.toSafeNumber(this.formModel.id),
      name: this.toSafeString(this.formModel.name),
      type: this.toSafeString(this.formModel.type),
      documentVersion: this.toSafeString(this.formModel.documentVersion),
      htmlCode: this.toSafeString(this.formModel.htmlCode),
      isMandatory: this.formModel.isMandatory,
      isActive: this.formModel.isActive,
      isMajorChange: this.formModel.isMajorChange,
      country: this.toSafeString(this.formModel.country),
      createdByUserId: this.toSafeNumber(this.formModel.createdByUserId),
      createdAt: now,
      updatedAt: now
    };
  }

  private toSafeNumber(value: number): number {
    return Number.isFinite(value) ? value : 0;
  }

  private toSafeString(value: string): string {
    return typeof value === 'string' ? value : '';
  }

  private defaultErrorMessage(): string {
    return this.isEditMode() ? 'Unable to update consent.' : 'Unable to create consent.';
  }

  private sanitizeMessage(message: string | null | undefined): string {
    return typeof message === 'string' ? message.trim() : '';
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error;
    }

    if (error.status === 0) {
      return 'Unable to connect to the server. Please check your network and API availability.';
    }

    return `${fallback} (HTTP ${error.status || 'unknown'}).`;
  }
}
