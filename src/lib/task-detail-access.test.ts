import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkTaskDetailAccess } from './task-detail-access';

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.__ZHIJI_CONFIG__;
  delete process.env.ZHIJI_SERVER_API_URL;
});

describe('checkTaskDetailAccess', () => {
  it('allows an interpretable loligo task', async () => {
    process.env.ZHIJI_SERVER_API_URL = 'http://loligo.test/api';
    window.__ZHIJI_CONFIG__ = { BACKEND: 'loligo' };
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe('http://loligo.test/api/v1/tasks/11111111-1111-4111-8111-111111111111');
      return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', template: 'somatic', status: 'completed' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(checkTaskDetailAccess('11111111-1111-4111-8111-111111111111', 'token')).resolves.toBe('allowed');
  });

  it('hides baseline resources and uses the loligo prefix on onykia', async () => {
    process.env.ZHIJI_SERVER_API_URL = 'http://onykia.test/api';
    window.__ZHIJI_CONFIG__ = { BACKEND: 'onykia' };
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe('http://onykia.test/api/v1/loligo/tasks/11111111-1111-4111-8111-111111111111');
      return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', template: 'baseline_fix', status: 'completed' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(checkTaskDetailAccess('11111111-1111-4111-8111-111111111111', 'token')).resolves.toBe('not_found');
  });

  it('reports the service unavailable when the request fails', async () => {
    process.env.ZHIJI_SERVER_API_URL = 'http://loligo.test/api';
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    await expect(checkTaskDetailAccess('11111111-1111-4111-8111-111111111111', 'token')).resolves.toBe('unavailable');
  });
});
