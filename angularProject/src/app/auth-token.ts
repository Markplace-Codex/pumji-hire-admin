export function readStoredAuthToken(storage: Storage | undefined = globalThis.localStorage): string | null {
  const authToken = storage?.getItem('authToken')?.trim();
  if (authToken) {
    return normalizeTokenValue(authToken);
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
    return typeof nestedToken === 'string' ? normalizeTokenValue(nestedToken) : null;
  } catch {
    return null;
  }
}

export function toBearerAuthorizationHeaderValue(token: string | null | undefined): string | null {
  const normalizedToken = normalizeTokenValue(token ?? '');
  if (!normalizedToken) {
    return null;
  }

  return /^bearer\s+/i.test(normalizedToken)
    ? normalizedToken
    : `Bearer ${normalizedToken}`;
}

function normalizeTokenValue(token: string): string | null {
  const trimmed = token.replace(/^['"]|['"]$/g, '').trim();
  return trimmed.length > 0 ? trimmed : null;
}
