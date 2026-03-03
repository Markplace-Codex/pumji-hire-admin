import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {
  protected readonly navigationCards = [
    {
      title: 'Customers List',
      description: 'Review and manage customer profiles.',
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
    }
  ];
}
