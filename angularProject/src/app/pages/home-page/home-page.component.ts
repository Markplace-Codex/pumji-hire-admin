import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type NavigationCard = {
  title: string;
  description: string;
  route?: string;
};

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {
  protected readonly navigationCards: NavigationCard[] = [
    {
      title: 'Customers List',
      description: 'View registered customers with pagination.',
      route: '/customers'
    },
    {
      title: 'Orders',
      description: 'Track all order requests and statuses.',
      route: '/orders'
    },
    {
      title: 'Credits (Add/Edit)',
      description: 'Add and edit credit balances.',
      route: '/credits'
    },
    {
      title: 'Interview Schedules',
      description: 'View upcoming interview plans.',
      route: '/interview-schedules'
    },
    {
      title: 'Contract Requests',
      description: 'Handle customer contract requests.',
      route: '/contract-requests'
    },
    {
      title: 'Contact Us Requests',
      description: 'Respond to contact form submissions.',
      route: '/contact-us-requests'
    },
    {
      title: 'Configuration',
      description: 'Manage dropdowns, settings, products, and commissions.',
      route: '/configuration'
    }
  ];
}
