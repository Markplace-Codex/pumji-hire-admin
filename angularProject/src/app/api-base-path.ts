const FALLBACK_API_BASE_PATH = 'https://dev.pumji.com';
const API_BASE_PATH_STORAGE_KEY = 'apiBasePath';

export function resolveApiBasePath(): string {
  if (typeof globalThis === 'undefined') {
    return FALLBACK_API_BASE_PATH;
  }

  const runtimeConfig = (globalThis as { __API_BASE_PATH__?: unknown }).__API_BASE_PATH__;
  if (typeof runtimeConfig === 'string' && runtimeConfig.trim().length > 0) {
    return runtimeConfig.trim();
  }

  try {
    const storedValue = globalThis.localStorage?.getItem(API_BASE_PATH_STORAGE_KEY);
    if (storedValue && storedValue.trim().length > 0) {
      return storedValue.trim();
    }
  } catch {
    // localStorage can be unavailable in non-browser contexts.
  }

  return FALLBACK_API_BASE_PATH;
}

export function getApiBasePathStorageKey(): string {
  return API_BASE_PATH_STORAGE_KEY;
}
