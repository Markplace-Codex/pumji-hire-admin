import { Routes } from '@angular/router';

import { HomePageComponent } from './pages/home-page/home-page.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { ManagementPageComponent } from './pages/management-page/management-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPageComponent },
  { path: 'home', component: HomePageComponent },
  {
    path: 'customers',
    component: ManagementPageComponent,
    data: {
      title: 'Customers List',
      description: 'This page is ready for customer list management features.'
    }
  },
  {
    path: 'orders',
    component: ManagementPageComponent,
    data: {
      title: 'Orders',
      description: 'This page is ready for order management features.'
    }
  },
  {
    path: 'credits',
    component: ManagementPageComponent,
    data: {
      title: 'Credits - Add/Edit',
      description: 'This page is ready for adding and editing credits.'
    }
  },
  {
    path: 'interview-schedules',
    component: ManagementPageComponent,
    data: {
      title: 'Interview Schedules',
      description: 'This page is ready for interview schedule management.'
    }
  },
  {
    path: 'contract-requests',
    component: ManagementPageComponent,
    data: {
      title: 'Contract Requests',
      description: 'This page is ready for contract request management.'
    }
  },
  {
    path: 'contact-us-requests',
    component: ManagementPageComponent,
    data: {
      title: 'Contact Us Requests',
      description: 'This page is ready for contact us request management.'
    }
  },
  { path: '**', redirectTo: 'login' }
];
