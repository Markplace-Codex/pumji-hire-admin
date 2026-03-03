import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-management-page',
  imports: [RouterLink],
  templateUrl: './management-page.component.html',
  styleUrl: './management-page.component.scss'
})
export class ManagementPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly pageTitle = computed(() => this.route.snapshot.data['title'] as string);
  protected readonly pageDescription = computed(() => this.route.snapshot.data['description'] as string);
}
