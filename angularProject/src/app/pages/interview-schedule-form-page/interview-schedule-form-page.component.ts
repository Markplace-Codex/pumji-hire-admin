import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { InterviewService } from '../../api/api/interview.service';
import { OrderService } from '../../api/api/order.service';
import { resolveApiBasePath } from '../../api-base-path';
import { CreateInterviewScheduleRequest } from '../../api/model/createInterviewScheduleRequest';
import { Order } from '../../api/model/order';

type CustomerOption = {
  id?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
};

type CustomersApiResponse = {
  customerListResponses?: {
    customerList?: CustomerOption[];
  };
};

type InterviewScheduleFormModel = {
  id: number;
  userId: number;
  scheduleDate: string;
  scheduleTime: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  feedbackId: number;
  jobId: number;
  recruiterId: number;
  interviewRound: number;
  candidateAccept: number;
  orderId: number;
  supportAdminId: number;
  scheduleTimeSlot: string;
  scheduleType: number;
  productId: number;
  keyskills: string;
  serverExtension: string;
  isVideoReady: boolean;
  prioritizerId: number;
  isAcceptedDiscount: boolean;
  completedAt: string;
  isRetakeInterview: boolean;
  isPopupClosed: boolean;
  questionIds: string;
  skillsCsv: string;
};

@Component({
  selector: 'app-interview-schedule-form-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './interview-schedule-form-page.component.html',
  styleUrl: './interview-schedule-form-page.component.scss'
})
export class InterviewScheduleFormPageComponent {
  private readonly httpClient = inject(HttpClient);
  private readonly interviewService = inject(InterviewService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isEditMode = computed(() => this.route.snapshot.routeConfig?.path === 'interview-schedules/edit');

  protected readonly isSubmitting = signal(false);
  protected readonly isLoadingUsers = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal<string | null>(null);
  protected readonly usersLoadError = signal<string | null>(null);
  protected readonly users = signal<Array<{ id: number; displayName: string }>>([]);

  protected formModel: InterviewScheduleFormModel = this.createDefaultFormModel();

  protected readonly statusOptions = [
    { value: 1, label: 'Scheduled' },
    { value: 2, label: 'Completed' },
    { value: 3, label: 'Canceled' },
    { value: 4, label: 'Rescheduled' },
    { value: 5, label: 'Pending' },
    { value: 6, label: 'NoShow' },
    { value: 7, label: 'InCompleteInterview' },
    { value: 8, label: 'UnProcessedProfile' },
    { value: 9, label: 'ClosedInterview' },
    { value: 10, label: 'IsInprogress' },
    { value: 11, label: 'PartiallyCompleted' }
  ];

  protected readonly candidateAcceptOptions = [
    { value: 0, label: 'None' },
    { value: 2, label: 'Accept' },
    { value: 3, label: 'Ignore' }
  ];

  protected readonly scheduleTypeOptions = [
    { value: 0, label: 'None' },
    { value: 1, label: 'CandidateSchedule' },
    { value: 2, label: 'RecruiterSchedule' }
  ];

  constructor() {
    this.loadUsers();

    if (this.isEditMode()) {
      const stateSchedule = this.router.getCurrentNavigation()?.extras.state?.['schedule'] as
        | Partial<InterviewScheduleFormModel>
        | undefined;

      if (!stateSchedule) {
        this.submitError.set('No interview schedule selected. Please click Edit from Interview Schedules list.');
      } else {
        this.formModel = {
          ...this.formModel,
          ...stateSchedule,
          status: this.normalizeNumber(stateSchedule.status, 1),
          candidateAccept: this.normalizeNumber(stateSchedule.candidateAccept, 0),
          scheduleType: this.normalizeNumber(stateSchedule.scheduleType, 0),
          scheduleDate: this.isoToLocalInput(stateSchedule.scheduleDate),
          createdAt: this.isoToLocalInput(stateSchedule.createdAt),
          updatedAt: this.isoToLocalInput(stateSchedule.updatedAt),
          completedAt: this.isoToLocalInput(stateSchedule.completedAt)
        };
      }
    }

    const loggedInCustomerId = this.getLoggedInCustomerId();
    if (loggedInCustomerId !== null) {
      this.formModel = {
        ...this.formModel,
        recruiterId: loggedInCustomerId
      };
    }
  }

  private loadUsers(): void {
    this.isLoadingUsers.set(true);
    this.usersLoadError.set(null);

    this.httpClient
      .get<CustomersApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/Customers`, {
        params: {
          pageIndex: 0,
          pageSize: 2147483647
        }
      })
      .subscribe({
        next: (response) => {
          const userOptions = (response.customerListResponses?.customerList ?? [])
            .filter((customer): customer is { id: number; username?: string } => customer.id != null)
            .map((customer) => ({
              id: customer.id,
              username: customer.username?.trim() || `User #${customer.id}`
            }));

          this.users.set(userOptions);
          this.isLoadingUsers.set(false);
        },
        error: () => {
          this.usersLoadError.set('Unable to load users right now. Please try again.');
          this.isLoadingUsers.set(false);
        }
      });
  }

  private loadUsers(): void {
    this.isLoadingUsers.set(true);
    this.usersLoadError.set(null);

    this.httpClient
      .get<CustomersApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/Customers`, {
        params: {
          pageIndex: 0,
          pageSize: 2147483647
        }
      })
      .subscribe({
        next: (response) => {
          const userOptions = (response.customerListResponses?.customerList ?? [])
            .filter((customer): customer is { id: number; username?: string; firstName?: string; lastName?: string } =>
              customer.id != null
            )
            .map((customer) => ({
              id: customer.id,
              displayName: this.getUserDisplayName(customer)
            }))
            .sort((a, b) => a.displayName.localeCompare(b.displayName));

          this.users.set(userOptions);
          this.isLoadingUsers.set(false);
        },
        error: () => {
          this.usersLoadError.set('Unable to load users right now. Please try again.');
          this.isLoadingUsers.set(false);
        }
      });
  }


  private getUserDisplayName(customer: { id: number; username?: string; firstName?: string; lastName?: string }): string {
    const fullName = `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim();
    if (fullName.length > 0) {
      return customer.username?.trim() ? `${fullName} (${customer.username.trim()})` : fullName;
    }

    return customer.username?.trim() || `User #${customer.id}`;
  }

  protected submitForm(): void {
    this.isSubmitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(null);

    if (!Number.isFinite(this.formModel.userId) || this.formModel.userId <= 0) {
      this.submitError.set('Please select a valid user.');
      this.isSubmitting.set(false);
      return;
    }

    if (this.isEditMode()) {
      const payload = this.buildUpdatePayload();
      this.orderService.apiOrderUpdatePut(payload).subscribe({
        next: (response) => {
          if (response.isSuccess === false) {
            this.submitError.set(this.sanitizeMessage(response.message) || 'Unable to update interview schedule right now.');
            this.isSubmitting.set(false);
            return;
          }

          this.submitSuccess.set('Interview schedule updated successfully.');
          this.handleSuccess();
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(this.resolveErrorMessage(error));
          this.isSubmitting.set(false);
        }
      });

      return;
    }

    const payload = this.buildCreatePayload();
    this.interviewService.apiInterviewCreateInterviewSchedulePost(payload).subscribe({
      next: () => {
        this.submitSuccess.set('Interview schedule created successfully.');
        this.handleSuccess();
      },
      error: (error: HttpErrorResponse) => {
        this.submitError.set(this.resolveErrorMessage(error));
        this.isSubmitting.set(false);
      }
    });
  }

  protected applySampleData(): void {
    this.formModel = this.createDefaultFormModel();
  }

  private handleSuccess(): void {
    this.isSubmitting.set(false);

    setTimeout(() => {
      this.router.navigate(['/interview-schedules']);
    }, 700);
  }

  private createDefaultFormModel(): InterviewScheduleFormModel {
    return {
      id: 0,
      userId: 0,
      scheduleDate: this.isoToLocalInput('2026-03-05T19:10:17.854Z'),
      scheduleTime: 'string',
      status: 1,
      createdAt: this.isoToLocalInput('2026-03-05T19:10:17.854Z'),
      updatedAt: this.isoToLocalInput('2026-03-05T19:10:17.854Z'),
      feedbackId: 0,
      jobId: 0,
      recruiterId: 0,
      interviewRound: 0,
      candidateAccept: 0,
      orderId: 0,
      supportAdminId: 0,
      scheduleTimeSlot: 'string',
      scheduleType: 0,
      productId: 0,
      keyskills: 'string',
      serverExtension: 'string',
      isVideoReady: true,
      prioritizerId: 0,
      isAcceptedDiscount: true,
      completedAt: this.isoToLocalInput('2026-03-05T19:10:17.854Z'),
      isRetakeInterview: true,
      isPopupClosed: true,
      questionIds: 'string',
      skillsCsv: 'string'
    };
  }

  private buildCreatePayload(): CreateInterviewScheduleRequest {
    return {
      interviewSchedule: {
        id: this.formModel.id,
        userId: this.formModel.userId,
        scheduleDate: this.localToIsoString(this.formModel.scheduleDate),
        scheduleTime: this.formModel.scheduleTime,
        status: this.formModel.status as any,
        createdAt: this.localToIsoString(this.formModel.createdAt),
        updatedAt: this.localToIsoString(this.formModel.updatedAt),
        feedbackId: this.formModel.feedbackId,
        jobId: this.formModel.jobId,
        recruiterId: this.getLoggedInCustomerId() ?? this.formModel.recruiterId,
        interviewRound: this.formModel.interviewRound,
        candidateAccept: this.formModel.candidateAccept as any,
        orderId: this.formModel.orderId,
        supportAdminId: this.formModel.supportAdminId,
        scheduleTimeSlot: this.formModel.scheduleTimeSlot,
        scheduleType: this.formModel.scheduleType as any,
        productId: this.formModel.productId,
        keyskills: this.formModel.keyskills,
        serverExtension: this.formModel.serverExtension,
        isVideoReady: this.formModel.isVideoReady,
        prioritizerId: this.formModel.prioritizerId,
        isAcceptedDiscount: this.formModel.isAcceptedDiscount,
        completedAt: this.localToIsoString(this.formModel.completedAt),
        isRetakeInterview: this.formModel.isRetakeInterview,
        isPopupClosed: this.formModel.isPopupClosed,
        questionIds: this.formModel.questionIds
      } as any,
      skills: this.formModel.skillsCsv
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    };
  }

  private buildUpdatePayload(): Order {
    return {
      id: this.formModel.id,
      userId: this.formModel.userId,
      scheduleDate: this.localToIsoString(this.formModel.scheduleDate),
      scheduleTime: this.formModel.scheduleTime,
      status: this.formModel.status as any,
      createdAt: this.localToIsoString(this.formModel.createdAt),
      updatedAt: this.localToIsoString(this.formModel.updatedAt),
      feedbackId: this.formModel.feedbackId,
      jobId: this.formModel.jobId,
      recruiterId: this.getLoggedInCustomerId() ?? this.formModel.recruiterId,
      interviewRound: this.formModel.interviewRound,
      candidateAccept: this.formModel.candidateAccept as any,
      orderId: this.formModel.orderId,
      supportAdminId: this.formModel.supportAdminId,
      scheduleTimeSlot: this.formModel.scheduleTimeSlot,
      scheduleType: this.formModel.scheduleType as any,
      productId: this.formModel.productId,
      keyskills: this.formModel.keyskills,
      serverExtension: this.formModel.serverExtension,
      isVideoReady: this.formModel.isVideoReady,
      prioritizerId: this.formModel.prioritizerId,
      isAcceptedDiscount: this.formModel.isAcceptedDiscount,
      completedAt: this.localToIsoString(this.formModel.completedAt),
      isRetakeInterview: this.formModel.isRetakeInterview,
      isPopupClosed: this.formModel.isPopupClosed,
      questionIds: this.formModel.questionIds
    } as any;
  }

  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      const sanitizedMessage = this.sanitizeMessage(message);
      if (sanitizedMessage) {
        return sanitizedMessage;
      }
    }

    return this.isEditMode()
      ? 'Unable to update interview schedule right now.'
      : 'Unable to create interview schedule right now.';
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

  private isoToLocalInput(value: unknown): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const pad = (unit: number): string => unit.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private localToIsoString(value: string): string {
    return value ? new Date(value).toISOString() : '';
  }

  private normalizeNumber(value: unknown, fallback: number): number {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  private getLoggedInCustomerId(): number | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const loginResponseRaw = localStorage.getItem('loginResponse');
    if (!loginResponseRaw) {
      return null;
    }

    try {
      const parsed = JSON.parse(loginResponseRaw) as { authenticateResponse?: { customerId?: unknown } };
      const customerId = parsed.authenticateResponse?.customerId;

      return typeof customerId === 'number' && Number.isFinite(customerId) ? customerId : null;
    } catch {
      return null;
    }
  }
}
