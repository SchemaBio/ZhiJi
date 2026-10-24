import { checkTaskDetailAccess } from './lib/task-detail-access';
import { contentSecurityPolicy } from './lib/content-security-policy';
import { NextResponse, type NextRequest } from 'next/server';
import { localeCookie, resolveLocale } from './i18n/locales';
import { createTextTranslator } from './i18n/text';

function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...Array.from(bytes)));
}

export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const taskRoute = request.nextUrl.pathname.match(/^\/tasks\/([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})\/?$/i);
  if (taskRoute) {
    const token = request.cookies.get('access_token')?.value;
    const access = token ? await checkTaskDetailAccess(taskRoute[1], token) : 'unauthorized';
    if (access === 'not_found') {
      const destination = request.nextUrl.clone();
      destination.pathname = '/404';
      destination.search = '';
      const response = NextResponse.rewrite(destination, { status: 404, request: { headers: requestHeaders } });
      response.headers.set('Content-Security-Policy', csp);
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
    if (access === 'unauthorized') {
      const destination = new URL('/login', request.url);
      destination.searchParams.set('next', request.nextUrl.pathname);
      return NextResponse.redirect(destination);
    }
    if (access === 'unavailable') {
      const locale = resolveLocale(
        request.cookies.get(localeCookie)?.value,
        process.env.ZHIJI_DEFAULT_LOCALE ?? process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
      );
      return new NextResponse(createTextTranslator(locale)('tasks.serviceUnavailable'), {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Language': locale,
          'Cache-Control': 'private, no-store',
        },
      });
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
