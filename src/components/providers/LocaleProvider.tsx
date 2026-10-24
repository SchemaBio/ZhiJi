'use client';

import * as React from 'react';
import { defaultLocale, type Locale } from '@/i18n/locales';

const LocaleContext = React.createContext<Locale>(defaultLocale);

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={initialLocale}>{children}</LocaleContext.Provider>;
}

export function useAppLocale(): Locale {
  return React.useContext(LocaleContext);
}
