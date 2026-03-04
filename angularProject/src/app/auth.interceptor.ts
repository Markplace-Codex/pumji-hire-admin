import { HttpInterceptorFn } from '@angular/common/http';

import { resolveApiBasePath } from './api-base-path';
import { normalizeTokenValue, readStoredAuthToken } from './auth-token';

function isApiRequest(url: string): boolean {
  const apiBasePath = resolveApiBasePath().replace(/\/+$/, '');
  return url.startsWith('/api/') || url.startsWith(`${apiBasePath}/api/`);
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = normalizeTokenValue(readStoredAuthToken());
  const bearerToken = token ? `Bearer ${token.replace(/^bearer\s+/i, '').trim()}` : null;

  let requestWithHeaders = request;

  if (bearerToken && !request.headers.has('Authorization')) {
    requestWithHeaders = requestWithHeaders.clone({
      setHeaders: {
        Authorization: bearerToken
      }
    });
  }

  if (!requestWithHeaders.headers.has('Content-Type') && !(requestWithHeaders.body instanceof FormData)) {
    requestWithHeaders = requestWithHeaders.clone({
      setHeaders: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }

  if (isApiRequest(requestWithHeaders.url) && !requestWithHeaders.withCredentials) {
    requestWithHeaders = requestWithHeaders.clone({ withCredentials: true });
  }

  return next(requestWithHeaders);
};
