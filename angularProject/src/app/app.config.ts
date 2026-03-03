import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { BASE_PATH } from './api/variables';
import { routes } from './app.routes';

const apiBasePath = (() => {
  if (typeof globalThis === 'undefined') {
    return '';
  }

  const runtimeApiBasePath = (globalThis as { __API_BASE_PATH__?: string }).__API_BASE_PATH__;
  return runtimeApiBasePath?.trim() ?? globalThis.location?.origin ?? '';
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
