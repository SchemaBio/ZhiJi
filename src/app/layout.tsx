import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { AppProviders } from '@/components/providers/AppProviders';
import { getRequestLocale } from '@/i18n/server';
import { createTextTranslator } from '@/i18n/text';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = createTextTranslator(await getRequestLocale());
  return {
    title: t('common.appName'),
    description: t('common.appDescription'),
    icons: {
      icon: '/logo.png',
      apple: '/logo.png',
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? undefined;
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script nonce={nonce} src="/runtime-config.js" suppressHydrationWarning />
      </head>
      <body>
        <AppProviders locale={locale}>{children}</AppProviders>
      </body>
    </html>
  );
}
