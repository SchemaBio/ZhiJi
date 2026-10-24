import { afterEach, describe, expect, it } from 'vitest';
import { getRuntimeBackendFlavor, getRuntimeCoreApiPrefix, normalizeBaseUrl } from './runtime-config';

afterEach(() => {
  delete window.__ZHIJI_CONFIG__;
  delete process.env.NEXT_PUBLIC_BACKEND;
  delete process.env.ZHIJI_BACKEND;
});

describe('runtime backend flavor', () => {
  it('uses an empty core prefix for loligo', () => {
    window.__ZHIJI_CONFIG__ = { BACKEND: 'loligo' };
    expect(getRuntimeBackendFlavor()).toBe('loligo');
    expect(getRuntimeCoreApiPrefix()).toBe('');
  });

  it('prefixes core requests with /v1/loligo for onykia', () => {
    window.__ZHIJI_CONFIG__ = { BACKEND: 'onykia' };
    expect(getRuntimeBackendFlavor()).toBe('onykia');
    expect(getRuntimeCoreApiPrefix()).toBe('/v1/loligo');
  });

  it('does not invent a third backend name', () => {
    window.__ZHIJI_CONFIG__ = { BACKEND: 'squid' };
    expect(getRuntimeBackendFlavor()).toBe('loligo');
    expect(getRuntimeCoreApiPrefix()).toBe('');
  });
});

describe('normalizeBaseUrl', () => {
  it('rejects credentials and non-http protocols', () => {
    expect(normalizeBaseUrl('javascript:alert(1)', '/api')).toBe('/api');
    expect(normalizeBaseUrl('https://user:pass@example.test/api', '/api')).toBe('/api');
    expect(normalizeBaseUrl('https://loligo.internal/api/', '/api')).toBe('https://loligo.internal/api');
  });
});
