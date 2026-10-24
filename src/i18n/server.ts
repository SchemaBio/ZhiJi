import { cookies } from 'next/headers';
import { localeCookie, resolveLocale, type Locale } from './locales';

export async function getRequestLocale(): Promise<Locale> {
  const jar = await cookies();
  return resolveLocale(
    jar.get(localeCookie)?.value,
    process.env.ZHIJI_DEFAULT_LOCALE || process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  );
}
