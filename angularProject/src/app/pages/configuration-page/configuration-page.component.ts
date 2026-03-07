import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type ConfigurationOption = {
  title: string;
  description: string;
  route?: string;
};

@Component({
  selector: 'app-configuration-page',
  imports: [RouterLink],
  templateUrl: './configuration-page.component.html',
  styleUrl: './configuration-page.component.scss'
})
export class ConfigurationPageComponent {
  protected readonly options: ConfigurationOption[] = [
    {
      title: 'Dropdown datas',
      description: 'View dropdown definitions fetched from API.',
      route: '/configuration/dropdown-datas'
    },
    {
      title: 'AllSettings',
      description: 'Manage global application settings.',
      route: '/configuration/all-settings'
    },
    {
      title: 'Products',
      description: 'Manage available products.'
    },
    {
      title: 'Affiliate commision',
      description: 'Manage affiliate commission configurations.'
    }
  ];
}
