import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { AdminLayoutPage } from './pages/admin-layout.page';
import { ContactUsRequestsPage } from './pages/contact-us-requests.page';
import { ContractRequestsPage } from './pages/contract-requests.page';
import { CreditsPage } from './pages/credits.page';
import { CustomersPage } from './pages/customers.page';
import { InterviewSchedulesPage } from './pages/interview-schedules.page';
import { LoginPage } from './pages/login.page';
import { OrdersPage } from './pages/orders.page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  {
    path: '',
    component: AdminLayoutPage,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'orders' },
      { path: 'orders', component: OrdersPage },
      { path: 'credits', component: CreditsPage },
      { path: 'customers', component: CustomersPage },
      { path: 'interview-schedules', component: InterviewSchedulesPage },
      { path: 'contract-requests', component: ContractRequestsPage },
      { path: 'contact-us-requests', component: ContactUsRequestsPage }
    ]
  },
  { path: '**', redirectTo: '' }
];
