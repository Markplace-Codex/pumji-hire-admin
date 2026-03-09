import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { DropDownService } from '../../api/api/dropDown.service';
import { DropDown } from '../../api/model/dropDown';
import { DropDownDto } from '../../api/model/dropDownDto';

type DropdownDataFormModel = {
  id: number;
  fieldName: string;
  fieldType: string;
  options: string;
  pageName: string;
  custField1: string;
  custField2: string;
  custField3: string;
};

@Component({
  selector: 'app-dropdown-data-form-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './dropdown-data-form-page.component.html',
  styleUrl: './dropdown-data-form-page.component.scss'
})
export class DropdownDataFormPageComponent implements OnInit {
  private readonly dropDownService = inject(DropDownService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isEditMode = computed(() => this.route.snapshot.routeConfig?.path === 'configuration/dropdown-datas/edit/:id');

  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal<string | null>(null);

  protected formModel: DropdownDataFormModel = this.createDefaultFormModel();

  ngOnInit(): void {
    if (!this.isEditMode()) {
      return;
    }

    const idValue = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(idValue) || idValue <= 0) {
      this.submitError.set('Invalid dropdown data id for edit.');
      return;
    }

    this.isLoading.set(true);
    this.dropDownService.apiDropDownIdGet(idValue).subscribe({
      next: (response) => {
        const dropDownDto = response.dropDownDto;
        if (!dropDownDto) {
          this.submitError.set('Unable to load dropdown data details.');
          this.isLoading.set(false);
          return;
        }

        this.formModel = this.mapDtoToFormModel(dropDownDto);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(this.resolveErrorMessage(error, 'Unable to load dropdown data for edit right now.'));
        this.isLoading.set(false);
      }
    });
  }

  protected applySampleData(): void {
    this.formModel = {
      id: this.isEditMode() ? this.formModel.id : 0,
      fieldName: 'string',
      fieldType: 'string',
      options: 'string',
      pageName: 'string',
      custField1: 'string',
      custField2: 'string',
      custField3: 'string'
    };
  }

  protected submitForm(): void {
    this.isSubmitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(null);

    const payload = this.buildPayload();
    const request$ = this.isEditMode()
      ? this.dropDownService.apiDropDownUpdatePut(payload)
      : this.dropDownService.apiDropDownCreatePost(payload);

    request$.subscribe({
      next: (response) => {
        if (response.isSuccess === false) {
          this.submitError.set(this.sanitizeMessage(response.message) || this.defaultErrorMessage());
          this.isSubmitting.set(false);
          return;
        }

        this.submitSuccess.set(this.isEditMode() ? 'Dropdown data updated successfully.' : 'Dropdown data created successfully.');
        this.isSubmitting.set(false);

        setTimeout(() => {
          this.router.navigate(['/configuration/dropdown-datas']);
        }, 600);
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(this.resolveErrorMessage(error, this.defaultErrorMessage()));
        this.isSubmitting.set(false);
      }
    });
  }

  private createDefaultFormModel(): DropdownDataFormModel {
    return {
      id: 0,
      fieldName: '',
      fieldType: '',
      options: '',
      pageName: '',
      custField1: '',
      custField2: '',
      custField3: ''
    };
  }

  private mapDtoToFormModel(dropDownDto: DropDownDto): DropdownDataFormModel {
    return {
      id: dropDownDto.id ?? 0,
      fieldName: dropDownDto.fieldName ?? '',
      fieldType: dropDownDto.fieldType ?? '',
      options: dropDownDto.options ?? '',
      pageName: dropDownDto.pageName ?? '',
      custField1: dropDownDto.custField1 ?? '',
      custField2: dropDownDto.custField2 ?? '',
      custField3: dropDownDto.custField3 ?? ''
    };
  }

  private buildPayload(): DropDown {
    return {
      id: this.toSafeNumber(this.formModel.id),
      fieldName: this.toSafeString(this.formModel.fieldName),
      fieldType: this.toSafeString(this.formModel.fieldType),
      options: this.toSafeString(this.formModel.options),
      pageName: this.toSafeString(this.formModel.pageName),
      custField1: this.toSafeString(this.formModel.custField1),
      custField2: this.toSafeString(this.formModel.custField2),
      custField3: this.toSafeString(this.formModel.custField3)
    };
  }

  private toSafeString(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private toSafeNumber(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
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
    return this.isEditMode() ? 'Unable to update dropdown data right now.' : 'Unable to create dropdown data right now.';
  }
}
