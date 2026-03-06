import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { resolveApiBasePath } from '../../api-base-path';
import { ContactService } from '../../api/api/contact.service';
import { ContactFromDto } from '../../api/model/contactFromDto';
import { CustomerBasicInfoSchema } from '../../api/model/customerBasicInfoSchema';

type PaginationDetails = {
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
};

type CreditsListItem = {
  id?: number;
  userId?: number;
  availableCredits?: number;
  usedCredits?: number;
  createdOn?: string;
  expiry?: string;
};

type CreditsApiResponse = {
  creditsListResponses?: {
    pagination?: PaginationDetails;
    creditsList?: CreditsListItem[];
  };
  isSuccess?: boolean;
  message?: string | null;
};

type ContractRequestListItem = {
  id?: number;
  userId?: number;
  worktype?: string;
  companyTypePref?: string;
  weeklyBasis?: number;
  monthlyBasis?: number;
  sixMonths?: number;
  year?: number;
  status?: string;
  createdAt?: string;
};

type ContractRequestsApiResponse = {
  contractListResponses?: {
    pagination?: PaginationDetails;
    contractorsList?: ContractRequestListItem[];
  };
  isSuccess?: boolean;
  message?: string | null;
};

@Component({
  selector: 'app-management-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './management-page.component.html',
  styleUrl: './management-page.component.scss'
})
export class ManagementPageComponent implements OnInit {
  private readonly contactPageSize = 10;
  private readonly defaultPageSize = 10;
  private customerInfoAccessDenied = false;

  private readonly route = inject(ActivatedRoute);
  private readonly httpClient = inject(HttpClient);
  private readonly contactService = inject(ContactService);

  protected readonly pageTitle = computed(() => this.route.snapshot.data['title'] as string);
  protected readonly pageDescription = computed(() => this.route.snapshot.data['description'] as string);

  protected readonly isContactUsPage = computed(() => this.route.snapshot.routeConfig?.path === 'contact-us-requests');
  protected readonly isCreditsPage = computed(() => this.route.snapshot.routeConfig?.path === 'credits');
  protected readonly isContractRequestsPage = computed(() => this.route.snapshot.routeConfig?.path === 'contract-requests');

  protected readonly contactRequestList = signal<ContactFromDto[]>([]);
  protected readonly contactCurrentPage = signal(1);
  protected readonly isLoadingContactRequests = signal(false);
  protected readonly contactRequestsErrorMessage = signal<string | null>(null);
  protected readonly paginatedContactRequests = computed(() => {
    const startIndex = (this.contactCurrentPage() - 1) * this.contactPageSize;
    return this.contactRequestList().slice(startIndex, startIndex + this.contactPageSize);
  });
  protected readonly contactTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.contactRequestList().length / this.contactPageSize))
  );

  protected readonly credits = signal<CreditsListItem[]>([]);
  protected readonly isLoadingCredits = signal(false);
  protected readonly creditsErrorMessage = signal<string | null>(null);
  protected readonly creditsCurrentPage = signal(0);
  protected readonly creditsPageSize = signal(this.defaultPageSize);
  protected readonly creditsTotalCount = signal(0);
  protected readonly creditsTotalPages = signal(0);
  protected readonly customerNameByUserId = signal<Record<number, string>>({});
  protected readonly creditsPageLabel = computed(() => {
    if (this.creditsTotalPages() === 0) {
      return 'Page 0 of 0';
    }

    return `Page ${this.creditsCurrentPage() + 1} of ${this.creditsTotalPages()}`;
  });
  protected readonly hasPreviousCreditsPage = computed(() => this.creditsCurrentPage() > 0);
  protected readonly hasNextCreditsPage = computed(() => this.creditsCurrentPage() + 1 < this.creditsTotalPages());

  protected readonly contractRequests = signal<ContractRequestListItem[]>([]);
  protected readonly isLoadingContractRequests = signal(false);
  protected readonly contractRequestsErrorMessage = signal<string | null>(null);
  protected readonly contractCurrentPage = signal(0);
  protected readonly contractPageSize = signal(this.defaultPageSize);
  protected readonly contractTotalCount = signal(0);
  protected readonly contractTotalPages = signal(0);
  protected readonly contractPageLabel = computed(() => {
    if (this.contractTotalPages() === 0) {
      return 'Page 0 of 0';
    }

    return `Page ${this.contractCurrentPage() + 1} of ${this.contractTotalPages()}`;
  });
  protected readonly hasPreviousContractPage = computed(() => this.contractCurrentPage() > 0);
  protected readonly hasNextContractPage = computed(() => this.contractCurrentPage() + 1 < this.contractTotalPages());

  protected getCustomerName(userId: number | undefined): string {
    if (typeof userId !== 'number') {
      return '';
    }

    return this.customerNameByUserId()[userId] ?? '';
  }

  ngOnInit(): void {
    if (this.isContactUsPage()) {
      this.loadContactRequests();
      return;
    }

    if (this.isCreditsPage()) {
      this.loadCredits(0);
      return;
    }

    if (this.isContractRequestsPage()) {
      this.loadContractRequests(0);
    }
  }

  private loadContactRequests(): void {
    this.isLoadingContactRequests.set(true);
    this.contactRequestsErrorMessage.set(null);

    this.contactService.apiContactGetAllGet(0, 2147483647).subscribe({
      next: (response) => {
        this.contactRequestList.set(response.paginationContactFrom?.contactFromDtos ?? []);
        this.contactCurrentPage.set(1);
        this.isLoadingContactRequests.set(false);
      },
      error: () => {
        this.contactRequestsErrorMessage.set('Unable to load contact requests right now. Please try again.');
        this.isLoadingContactRequests.set(false);
      }
    });
  }

  private loadCredits(pageIndex: number): void {
    this.isLoadingCredits.set(true);
    this.creditsErrorMessage.set(null);

    this.httpClient
      .get<CreditsApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/GetAllUserCredits`, {
        params: {
          pageIndex,
          pageSize: this.creditsPageSize()
        }
      })
      .subscribe({
        next: (response) => {
          const pagination = response.creditsListResponses?.pagination;

          this.credits.set(response.creditsListResponses?.creditsList ?? []);
          this.loadCustomerNamesForCredits(this.credits());
          this.creditsCurrentPage.set(pagination?.currentPage ?? pageIndex);
          this.creditsPageSize.set(pagination?.pageSize ?? this.defaultPageSize);
          this.creditsTotalCount.set(pagination?.totalCount ?? 0);
          this.creditsTotalPages.set(pagination?.totalPages ?? 0);
          this.isLoadingCredits.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.creditsErrorMessage.set(this.resolveErrorMessage(error, 'credits'));
          this.isLoadingCredits.set(false);
        }
      });
  }

  private loadCustomerNamesForCredits(credits: CreditsListItem[]): void {
    const idsToFetch = [...new Set(credits.map((credit) => credit.userId).filter((id): id is number => typeof id === 'number'))].filter(
      (id) => !this.customerNameByUserId()[id]
    );

    if (idsToFetch.length === 0 || this.customerInfoAccessDenied) {
      return;
    }

    const requests = idsToFetch.map((userId) =>
      this.getCustomerInfo(userId).pipe(
        map((response) => {
          const customerInfo = response.customerBasicInfo;
          const customerName = customerInfo?.customerName?.trim() || customerInfo?.userName?.trim() || '';

          return {
            userId,
            customerName
          };
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            this.customerInfoAccessDenied = true;
          }

          return of({ userId, customerName: '' });
        })
      )
    );

    forkJoin(requests).subscribe((results) => {
      const existing = this.customerNameByUserId();
      const updated: Record<number, string> = { ...existing };

      for (const result of results) {
        updated[result.userId] = result.customerName;
      }

      this.customerNameByUserId.set(updated);
    });
  }

  private getCustomerInfo(userId: number) {
    return this.httpClient.get<CustomerBasicInfoSchema>(`${resolveApiBasePath()}/api/Customer/GetCustomerInfo`, {
      params: { UserId: userId }
    });
  }

  private loadContractRequests(pageIndex: number): void {
    this.isLoadingContractRequests.set(true);
    this.contractRequestsErrorMessage.set(null);

    this.httpClient
      .get<ContractRequestsApiResponse>(`${resolveApiBasePath()}/api/SuperAdmin/GetAllContractRequests`, {
        params: {
          pageIndex,
          pageSize: this.contractPageSize()
        }
      })
      .subscribe({
        next: (response) => {
          const pagination = response.contractListResponses?.pagination;

          this.contractRequests.set(response.contractListResponses?.contractorsList ?? []);
          this.contractCurrentPage.set(pagination?.currentPage ?? pageIndex);
          this.contractPageSize.set(pagination?.pageSize ?? this.defaultPageSize);
          this.contractTotalCount.set(pagination?.totalCount ?? 0);
          this.contractTotalPages.set(pagination?.totalPages ?? 0);
          this.isLoadingContractRequests.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.contractRequestsErrorMessage.set(this.resolveErrorMessage(error, 'contract requests'));
          this.isLoadingContractRequests.set(false);
        }
      });
  }

  protected previousContactPage(): void {
    if (this.contactCurrentPage() > 1) {
      this.contactCurrentPage.update((currentPage) => currentPage - 1);
    }
  }

  protected nextContactPage(): void {
    if (this.contactCurrentPage() < this.contactTotalPages()) {
      this.contactCurrentPage.update((currentPage) => currentPage + 1);
    }
  }

  protected goToPreviousCreditsPage(): void {
    if (!this.hasPreviousCreditsPage() || this.isLoadingCredits()) {
      return;
    }

    this.loadCredits(this.creditsCurrentPage() - 1);
  }

  protected goToNextCreditsPage(): void {
    if (!this.hasNextCreditsPage() || this.isLoadingCredits()) {
      return;
    }

    this.loadCredits(this.creditsCurrentPage() + 1);
  }

  protected retryCredits(): void {
    this.loadCredits(this.creditsCurrentPage());
  }

  protected goToPreviousContractPage(): void {
    if (!this.hasPreviousContractPage() || this.isLoadingContractRequests()) {
      return;
    }

    this.loadContractRequests(this.contractCurrentPage() - 1);
  }

  protected goToNextContractPage(): void {
    if (!this.hasNextContractPage() || this.isLoadingContractRequests()) {
      return;
    }

    this.loadContractRequests(this.contractCurrentPage() + 1);
  }

  protected retryContractRequests(): void {
    this.loadContractRequests(this.contractCurrentPage());
  }

  private resolveErrorMessage(error: HttpErrorResponse, resourceName: string): string {
    if (error.status === 401 || error.status === 403) {
      return `You are not authorized to view ${resourceName}. Please sign in again.`;
    }

    if (error.status === 404) {
      return `${resourceName[0].toUpperCase()}${resourceName.slice(1)} API endpoint was not found. Please check API configuration.`;
    }

    if (typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
      const message = (error.error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return `Unable to load ${resourceName} right now. Please try again.`;
  }
}
