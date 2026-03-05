import { Routes } from '@angular/router';

import { HomePageComponent } from './pages/home-page/home-page.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { ManagementPageComponent } from './pages/management-page/management-page.component';
import { OrdersPageComponent } from './pages/orders-page/orders-page.component';
import { InterviewSchedulesPageComponent } from './pages/interview-schedules-page/interview-schedules-page.component';
import { CustomersPageComponent } from './pages/customers-page/customers-page.component';
import { OrderFormPageComponent } from './pages/order-form-page/order-form-page.component';
import { InterviewScheduleFormPageComponent } from './pages/interview-schedule-form-page/interview-schedule-form-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPageComponent },
  { path: 'home', component: HomePageComponent },
  { path: 'customers', component: CustomersPageComponent },
  { path: 'orders', component: OrdersPageComponent },
  { path: 'orders/add', component: OrderFormPageComponent },
  { path: 'orders/edit', component: OrderFormPageComponent },
  {
    path: 'credits',
    component: ManagementPageComponent,
    data: {
      title: 'Credits - Add/Edit',
      description: 'This page is ready for adding and editing credits.'
    }
  },
  { path: 'interview-schedules', component: InterviewSchedulesPageComponent },
  { path: 'interview-schedules/add', component: InterviewScheduleFormPageComponent },
  { path: 'interview-schedules/edit', component: InterviewScheduleFormPageComponent },
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
