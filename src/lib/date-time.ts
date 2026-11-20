import { formatLocalDateTime } from './utils';

export function formatDateTime(value?: string, empty = '—'): string {
  const formatted = formatLocalDateTime(value);
  return formatted === '-' ? empty : formatted;
}
