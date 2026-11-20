import { resolveLocale, type Locale } from '@/i18n/locales';

declare global {
  interface Window {
    __ZHIJI_CONFIG__?: {
      API_URL?: string;
      BACKEND?: 'loligo' | 'onykia';
      SUPPORT_EMAIL?: string;
      UPLOAD_ORIGINS?: string;
      PASSWORD_RESET_ENABLED?: string;
      DEFAULT_LOCALE?: Locale;
    };
  }
}

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith('//') || trimmed.includes('\\') || /[\u0000-\u001f]/.test(trimmed)) {
    return fallback;
  }

  if (trimmed.startsWith('/')) {
    const pathOnly = trimmed.split(/[?#]/, 1)[0];
    if (hasUnsafePathSegment(pathOnly)) {
      return fallback;
    }
    return pathOnly === '/' ? '' : pathOnly.replace(/\/+$/, '');
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallback;
    }
    if (parsed.username || parsed.password) {
      return fallback;
    }
    if (hasUnsafePathSegment(parsed.pathname)) {
      return fallback;
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return fallback;
  }
}

function hasUnsafePathSegment(path: string): boolean {
  if (path.includes('\\') || /[\u0000-\u001f]/.test(path)) return true;
  const segments = path.split('/').filter(Boolean);
  for (const segment of segments) {
    const decoded = decodePathSegment(segment);
    if (decoded === null) {
      return true;
    }
    if (
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      /[\u0000-\u001f]/.test(decoded)
    ) {
      return true;
    }
  }
  return false;
}

function decodePathSegment(segment: string): string | null {
  let decoded = segment;
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return decoded;
      decoded = next;
    } catch {
      return null;
    }
  }
  return decoded;
}

export function getRuntimeApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const runtimeValue = window.__ZHIJI_CONFIG__?.API_URL;
    if (runtimeValue) return normalizeBaseUrl(runtimeValue, '/api');
  }
  return normalizeBaseUrl(process.env.ZHIJI_API_URL || process.env.NEXT_PUBLIC_API_URL, '/api');
}

export function getRuntimeCoreApiPrefix(): string {
  return getRuntimeBackendFlavor() === 'onykia' ? '/v1/loligo' : '';
}

export function getRuntimeBackendFlavor(): 'loligo' | 'onykia' {
  const value = typeof window !== 'undefined'
    ? window.__ZHIJI_CONFIG__?.BACKEND
    : process.env.ZHIJI_BACKEND || process.env.NEXT_PUBLIC_BACKEND;
  return value === 'onykia' ? 'onykia' : 'loligo';
}

export function getRuntimeUploadOrigins(): string[] {
  const raw = typeof window !== 'undefined'
    ? window.__ZHIJI_CONFIG__?.UPLOAD_ORIGINS
    : process.env.ZHIJI_UPLOAD_ORIGINS;
  return (raw || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      try {
        const parsed = new URL(value);
        if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password) {
          return [];
        }
        return [parsed.origin];
      } catch {
        return [];
      }
    });
}

export function getRuntimePasswordResetEnabled(): boolean {
  const value = typeof window !== 'undefined'
    ? window.__ZHIJI_CONFIG__?.PASSWORD_RESET_ENABLED
    : process.env.ZHIJI_PASSWORD_RESET_ENABLED || process.env.NEXT_PUBLIC_PASSWORD_RESET_ENABLED;
  return String(value || '').trim().toLowerCase() === 'true';
}

export function getRuntimeSupportEmail(): string {
  const value = typeof window !== 'undefined'
    ? window.__ZHIJI_CONFIG__?.SUPPORT_EMAIL
    : process.env.ZHIJI_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? normalized
    : getRuntimeBackendFlavor() === 'onykia' ? 'support@schema-bio.com' : '';
}

export {};

export function getRuntimeDefaultLocale(): Locale {
  const value = typeof window !== 'undefined'
    ? window.__ZHIJI_CONFIG__?.DEFAULT_LOCALE ?? process.env.NEXT_PUBLIC_DEFAULT_LOCALE
    : process.env.ZHIJI_DEFAULT_LOCALE ?? process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  return resolveLocale(undefined, value);
}
