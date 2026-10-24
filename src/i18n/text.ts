import zh from './messages/zh-CN.json';
import { defaultLocale, type Locale } from './locales';

export type TextValues = Record<string, string | number | Date>;
export type TextTranslator = ((key: string, values?: TextValues) => string) & { readonly locale: Locale };

function lookup(catalog: unknown, key: string): string | undefined {
  const entry = key.split('.').reduce<unknown>((value, part) => {
    if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, part)) {
      return (value as Record<string, unknown>)[part];
    }
    return undefined;
  }, catalog);
  return typeof entry === 'string' ? entry : undefined;
}

export function createTextTranslator(locale: Locale = defaultLocale): TextTranslator {
  const translate = (key: string, values?: TextValues) => {
    let message = lookup(zh, key) ?? key;
    if (values) {
      for (const [name, value] of Object.entries(values)) {
        message = message.split(`{${name}}`).join(String(value));
      }
    }
    return message;
  };
  return Object.assign(translate, { locale });
}

export const chineseText = createTextTranslator(defaultLocale);
