function logToBrowserConsole(message: string, payload: unknown): void {
  if (typeof window === 'undefined') {
    return;
  }

  console.log(message, payload);
}

export function logAuthDebug(message: string, payload: unknown): void {
  logToBrowserConsole(`[Auth Debug] ${message}`, payload);
}

export function readStoredAuthToken(storage: Storage | undefined = globalThis.localStorage): string | null {
  const authToken = normalizeTokenValue(storage?.getItem('authToken'));
  if (authToken) {
    logAuthDebug('Retrieved token from localStorage authToken:', authToken);
    return authToken;
  }

  const loginResponse = storage?.getItem('loginResponse')?.trim();
  if (!loginResponse) {
    return null;
  }

  try {
    const parsedResponse = JSON.parse(loginResponse) as {
      authenticateResponse?: { token?: unknown };
    };

    const nestedToken = parsedResponse.authenticateResponse?.token;
    const normalizedNestedToken = typeof nestedToken === 'string' ? normalizeTokenValue(nestedToken) : null;

    if (normalizedNestedToken) {
      logAuthDebug('Retrieved token from localStorage loginResponse:', normalizedNestedToken);
    }

    return normalizedNestedToken;
  } catch {
    return null;
  }
}

export function getAuthorizationHeaderCandidates(token: string | null | undefined): string[] {
  const normalizedToken = normalizeTokenValue(token);
  if (!normalizedToken) {
    return [];
  }

  const strippedToken = normalizedToken.replace(/^bearer\s+/i, '').trim();
  if (!strippedToken) {
    return [];
  }

  const bearerHeader = `Bearer ${strippedToken}`;
  const candidates = [bearerHeader, normalizedToken, strippedToken];
  return [...new Set(candidates)];
}

export function normalizeTokenValue(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }

  const trimmed = token.replace(/^['"]|['"]$/g, '').trim();
  return trimmed.length > 0 ? trimmed : null;
}
