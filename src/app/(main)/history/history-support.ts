import { ApiError } from '@/lib/api';
import type { FocusRow, HistoryType } from './history-engine';

export function isHistoryIndexUnavailable(table: HistoryType, failure: unknown) {
  if (!(failure instanceof ApiError) || table === 'snv-indel') return false;
  return failure.status === 501 ||
    (failure.status === 400 && /unsupported table|invalid history scope or type|history synchronization unavailable or invalid cursor/i.test(failure.message));
}

export function historySourceTarget(row: FocusRow) {
  const query = new URLSearchParams({ tab: row.table });
  if (row.rowId) query.set('row', row.rowId);
  if (row.rowId && ['snv-indel', 'hotspot', 'germline'].includes(row.table)) {
    const { chromosome, position } = row.fields;
    const point = position?.replaceAll(',', '');
    if (chromosome && point && /^\d+$/.test(point) && Number(point) > 0) {
      query.set('columnFilters', JSON.stringify([
        { column: 'Chromosome', operator: 'equals', value: chromosome },
        { column: 'Position', operator: 'equals', value: point },
      ]));
    }
  }
  return '/tasks/' + encodeURIComponent(row.taskUuid) + '?' + query.toString();
}
