'use client';

import * as React from 'react';
import { ThemeProvider } from '@schema/ui-kit';
import { AuthProvider } from './AuthProvider';
import { AIProvider } from './AIProvider';
import { LocaleProvider } from './LocaleProvider';
import { UploadProvider } from './UploadProvider';
import type { Locale } from '@/i18n/locales';

interface AppProvidersProps {
  children: React.ReactNode;
  locale: Locale;
}

export function AppProviders({ children, locale }: AppProvidersProps) {
  return (
    <LocaleProvider initialLocale={locale}>
      <ThemeProvider defaultTheme="light" storageKey="somatic-theme">
        <AuthProvider>
          <UploadProvider>
            <AIProvider>{children}</AIProvider>
          </UploadProvider>
        </AuthProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
