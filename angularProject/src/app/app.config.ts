import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { BASE_PATH } from './api/variables';
import { routes } from './app.routes';

<<<<<<< codex/add-super-admin-login-page-jgso9a
const defaultApiOrigin = 'https://dev.pumji.com';

const apiBasePath = (() => {
  if (typeof globalThis === 'undefined') {
    return defaultApiOrigin;
  }

  const runtimeApiBasePath = (globalThis as { __API_BASE_PATH__?: string }).__API_BASE_PATH__;
  if (runtimeApiBasePath?.trim()) {
    return runtimeApiBasePath.trim();
  }

  const currentOrigin = globalThis.location?.origin ?? '';
  if (currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')) {
    return defaultApiOrigin;
  }

  return currentOrigin || defaultApiOrigin;
=======
const apiBasePath = (() => {
  if (typeof globalThis === 'undefined') {
    return '';
  }

  const runtimeApiBasePath = (globalThis as { __API_BASE_PATH__?: string }).__API_BASE_PATH__;
  return runtimeApiBasePath?.trim() ?? globalThis.location?.origin ?? '';
>>>>>>> Sravani/AdminBlock
})();

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(),
    { provide: BASE_PATH, useValue: apiBasePath }
  ]
};
