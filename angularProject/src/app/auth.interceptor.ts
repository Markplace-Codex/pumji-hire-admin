import { HttpInterceptorFn } from '@angular/common/http';

import { normalizeTokenValue, readStoredAuthToken } from './auth-token';

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

  return next(requestWithHeaders);
};
