import { Routes } from '@angular/router';

import { HomePageComponent } from './pages/home-page/home-page.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { ManagementPageComponent } from './pages/management-page/management-page.component';
import { OrdersPageComponent } from './pages/orders-page/orders-page.component';
import { InterviewSchedulesPageComponent } from './pages/interview-schedules-page/interview-schedules-page.component';
import { CustomersPageComponent } from './pages/customers-page/customers-page.component';
import { OrderFormPageComponent } from './pages/order-form-page/order-form-page.component';
import { InterviewScheduleFormPageComponent } from './pages/interview-schedule-form-page/interview-schedule-form-page.component';
import { CustomerFormPageComponent } from './pages/customer-form-page/customer-form-page.component';
import { ConfigurationPageComponent } from './pages/configuration-page/configuration-page.component';
import { DropdownDatasPageComponent } from './pages/dropdown-datas-page/dropdown-datas-page.component';
import { DropdownDataFormPageComponent } from './pages/dropdown-data-form-page/dropdown-data-form-page.component';
import { AllSettingsPageComponent } from './pages/all-settings-page/all-settings-page.component';
import { AllSettingsFormPageComponent } from './pages/all-settings-form-page/all-settings-form-page.component';
import { ProductsPageComponent } from './pages/products-page/products-page.component';
import { AffiliateCommissionPageComponent } from './pages/affiliate-commission-page/affiliate-commission-page.component';
import { AffiliateCommissionFormPageComponent } from './pages/affiliate-commission-form-page/affiliate-commission-form-page.component';
import { ProductFormPageComponent } from './pages/product-form-page/product-form-page.component';
import { ErrorLogsPageComponent } from './pages/error-logs-page/error-logs-page.component';
import { ConsentVersioningPageComponent } from './pages/consent-versioning-page/consent-versioning-page.component';
import { ManualCreditsPageComponent } from './pages/manual-credits-page/manual-credits-page.component';
import { ConsentPageComponent } from './pages/consent-page/consent-page.component';
import { ConsentFormPageComponent } from './pages/consent-form-page/consent-form-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPageComponent },
  { path: 'home', component: HomePageComponent },
  { path: 'customers', component: CustomersPageComponent },
  { path: 'customers/add', component: CustomerFormPageComponent },
  { path: 'customers/edit', component: CustomerFormPageComponent },
  { path: 'orders', component: OrdersPageComponent },
  { path: 'orders/add', component: OrderFormPageComponent },
  { path: 'orders/edit', component: OrderFormPageComponent },
  {
    path: 'credits',
    component: ManagementPageComponent,
    data: {
      title: 'Credits',
      description: 'This page is ready for adding and editing credits.'
    }
  },
  { path: 'credits/manual-add', component: ManualCreditsPageComponent },
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
  { path: 'error-logs', component: ErrorLogsPageComponent },
  { path: 'consent-versioning', component: ConsentVersioningPageComponent },
  { path: 'consent', component: ConsentPageComponent },
  { path: 'consent/add', component: ConsentFormPageComponent },
  { path: 'consent/edit/:id', component: ConsentFormPageComponent },
  { path: 'configuration', component: ConfigurationPageComponent },
  { path: 'configuration/dropdown-datas', component: DropdownDatasPageComponent },
  { path: 'configuration/dropdown-datas/add', component: DropdownDataFormPageComponent },
  { path: 'configuration/dropdown-datas/edit/:id', component: DropdownDataFormPageComponent },
  { path: 'configuration/all-settings', component: AllSettingsPageComponent },
  { path: 'configuration/all-settings/add', component: AllSettingsFormPageComponent },
  { path: 'configuration/all-settings/edit/:id', component: AllSettingsFormPageComponent },
  { path: 'configuration/products', component: ProductsPageComponent },
  { path: 'configuration/products/add', component: ProductFormPageComponent },
  { path: 'configuration/products/edit/:id', component: ProductFormPageComponent },
  { path: 'configuration/affiliate-commission', component: AffiliateCommissionPageComponent },
  { path: 'configuration/affiliate-commission/add', component: AffiliateCommissionFormPageComponent },
  { path: 'configuration/affiliate-commission/edit/:id', component: AffiliateCommissionFormPageComponent },
  { path: '**', redirectTo: 'login' }
];
