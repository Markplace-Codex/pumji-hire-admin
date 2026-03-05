import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContactService } from '../../api/api/contact.service';
import { ContactFromDto } from '../../api/model/contactFromDto';

@Component({
  selector: 'app-management-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './management-page.component.html',
  styleUrl: './management-page.component.scss'
})
export class ManagementPageComponent implements OnInit {
  private readonly contactPageSize = 10;
  private readonly route = inject(ActivatedRoute);
  private readonly contactService = inject(ContactService);

  protected readonly pageTitle = computed(() => this.route.snapshot.data['title'] as string);
  protected readonly pageDescription = computed(() => this.route.snapshot.data['description'] as string);

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

  protected readonly isContactUsPage = computed(() => this.route.snapshot.routeConfig?.path === 'contact-us-requests');

  ngOnInit(): void {
    if (this.isContactUsPage()) {
      this.loadContactRequests();
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
}
