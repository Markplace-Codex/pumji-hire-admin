import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { resolveApiBasePath } from '../../api-base-path';

type SettingPayload = {
  id: number;
  name: string | null;
  value: string | null;
  storeId: number;
};

type SettingResponse = {
  settingDto?: {
    id?: number;
    name?: string | null;
    value?: string | null;
    storeId?: number;
  };
  isSuccess?: boolean;
  message?: string | null;
};

type FormModel = {
  id: number;
  name: string;
  value: string;
  storeId: number;
};

@Component({
  selector: 'app-all-settings-form-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './all-settings-form-page.component.html',
  styleUrl: './all-settings-form-page.component.scss'
})
export class AllSettingsFormPageComponent implements OnInit {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isEditMode = computed(() => this.route.snapshot.routeConfig?.path === 'configuration/all-settings/edit/:id');

  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal<string | null>(null);

  protected formModel: FormModel = {
    id: 0,
    name: '',
    value: '',
    storeId: 0
  };

  ngOnInit(): void {
    if (!this.isEditMode()) {
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.submitError.set('Invalid setting id for edit.');
      return;
    }

    this.isLoading.set(true);
    this.httpClient.get<SettingResponse>(`${resolveApiBasePath()}/api/Setting/${id}`).subscribe({
      next: (response) => {
        const dto = response.settingDto;
        if (!dto) {
          this.submitError.set('Unable to load setting details.');
          this.isLoading.set(false);
          return;
        }

        this.formModel = {
          id: dto.id ?? 0,
          name: dto.name ?? '',
          value: dto.value ?? '',
          storeId: dto.storeId ?? 0
        };
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(this.resolveErrorMessage(error, 'Unable to load setting details right now.'));
        this.isLoading.set(false);
      }
    });
  }

  protected submitForm(): void {
    this.isSubmitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(null);

    const payload: SettingPayload = {
      id: this.toSafeNumber(this.formModel.id),
      name: this.toSafeString(this.formModel.name),
      value: this.toSafeString(this.formModel.value),
      storeId: this.toSafeNumber(this.formModel.storeId)
    };

    const request$ = this.isEditMode()
      ? this.httpClient.put<SettingResponse>(`${resolveApiBasePath()}/api/Setting/Update`, payload)
      : this.httpClient.post<SettingResponse>(`${resolveApiBasePath()}/api/Setting/Create`, payload);

    request$.subscribe({
      next: (response) => {
        if (response.isSuccess === false) {
          this.submitError.set(this.sanitizeMessage(response.message) || this.defaultErrorMessage());
          this.isSubmitting.set(false);
          return;
        }

        this.submitSuccess.set(this.isEditMode() ? 'All setting updated successfully.' : 'All setting created successfully.');
        this.isSubmitting.set(false);

        setTimeout(() => {
          this.router.navigate(['/configuration/all-settings']);
        }, 600);
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(this.resolveErrorMessage(error, this.defaultErrorMessage()));
        this.isSubmitting.set(false);
      }
    });
  }

  protected applySampleData(): void {
    this.formModel = {
      id: this.isEditMode() ? this.formModel.id : 0,
      name: 'string',
      value: 'string',
      storeId: 0
    };
  }

  private resolveErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      const sanitizedMessage = this.sanitizeMessage(message);
      if (sanitizedMessage) {
        return sanitizedMessage;
      }
    }

    return fallback;
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
    return this.isEditMode() ? 'Unable to update setting right now.' : 'Unable to create setting right now.';
  }

  private toSafeString(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private toSafeNumber(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }
}
