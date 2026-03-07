import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DropDownService } from '../../api/api/dropDown.service';
import { DropDownDto } from '../../api/model/dropDownDto';

@Component({
  selector: 'app-dropdown-datas-page',
  imports: [RouterLink],
  templateUrl: './dropdown-datas-page.component.html',
  styleUrl: './dropdown-datas-page.component.scss'
})
export class DropdownDatasPageComponent implements OnInit {
  private readonly dropDownService = inject(DropDownService);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly dropDownItems = signal<DropDownDto[]>([]);
  protected readonly hasDropDownItems = computed(() => this.dropDownItems().length > 0);

  ngOnInit(): void {
    this.loadDropDownDatas();
  }

  protected retry(): void {
    this.loadDropDownDatas();
  }

  private loadDropDownDatas(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.dropDownService.apiDropDownGetAllGet(0, 2147483647).subscribe({
      next: (response) => {
        this.dropDownItems.set(response.paginationDropDown?.dropDownDtos ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load dropdown datas. Please try again.');
        this.dropDownItems.set([]);
        this.isLoading.set(false);
      }
    });
  }
}
