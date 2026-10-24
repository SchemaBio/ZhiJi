import { chineseText, type TextTranslator, type TextValues } from './text';

export class LocalizedError extends Error {
  constructor(public readonly messageKey: string, public readonly values?: TextValues, originalMessage?: string) {
    super(originalMessage ?? chineseText(messageKey, values));
    this.name = 'LocalizedError';
  }
}

export function errorText(error: unknown, t: TextTranslator = chineseText): string {
  if (error instanceof LocalizedError) return t(error.messageKey, error.values);
  if (error instanceof Error && error.message) return error.message;
  return t('common.loading');
}
