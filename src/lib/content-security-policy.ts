function apiConnectSource() {
  const apiUrl = process.env.ZHIJI_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl || apiUrl.startsWith('/')) return '';
  if (apiUrl.startsWith('//') || apiUrl.includes('\\') || /[\u0000-\u001f]/.test(apiUrl)) return '';
  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    if (parsed.username || parsed.password) return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

function uploadConnectSources(): string[] {
  return (process.env.ZHIJI_UPLOAD_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      try {
        const parsed = new URL(value);
        if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password) return [];
        return [parsed.origin];
      } catch {
        return [];
      }
    });
}

export function contentSecurityPolicy(nonce: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  const scriptSrc = isProduction
    ? [`'self'`, `'nonce-${nonce}'`, `'wasm-unsafe-eval'`]
    : [`'self'`, `'nonce-${nonce}'`, `'unsafe-inline'`, `'unsafe-eval'`];
  const connectSrc = [`'self'`, apiConnectSource(), ...uploadConnectSources(), ...(isProduction ? [] : ['http://localhost:*', 'http://backend:*'])]
    .filter(Boolean)
    .join(' ');

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src ${connectSrc}`,
    `worker-src 'self' blob:`,
    `frame-src 'self'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');
}
