import type { SheetData } from 'write-excel-file/universal';
import { LocalizedError } from '@/i18n/errors';
import type { TextTranslator } from '@/i18n/text';
import { isHistoryIndexUnavailable } from './history-support';
import { HistoryWorkerClient, syncFocuses } from './history-client';
import { CLASS_LABELS, HISTORY_TYPES, historyColumns, historyColumnValue, type HistoryGroup, type HistoryQueryResult, type HistoryType } from './history-engine';

const maxDataRows = 1_048_575;

export async function createHistoryWorkbook(groups: ReadonlyMap<HistoryType, HistoryGroup[]>, t: TextTranslator, unavailable: ReadonlySet<HistoryType> = new Set()): Promise<Blob> {
  const { default: writeXlsxFile } = await import('write-excel-file/universal');
  return writeXlsxFile(HISTORY_TYPES.map(([table, label]) => {
    const columns = historyColumns(table);
    const header = columns.map(([, title]) => ({ value: t(title), fontWeight: 'bold' as const, backgroundColor: '#E8EFF8' }));
    const rows = groups.get(table) ?? [];
    if (rows.length > maxDataRows) throw new LocalizedError('history.exportTooLarge');
    const data: SheetData = [header, ...rows.map(group => columns.map(([key]) => {
      const raw = historyColumnValue(group, key);
      const value = key === 'classification' ? t(CLASS_LABELS[group.classification] ?? group.classification)
        : typeof raw === 'string' ? t(raw) : raw;
      return { value, type: typeof value === 'number' ? Number : String };
    }))];
    if (unavailable.has(table)) data.push([{ value: t('history.oncologyIndexUnavailable'), type: String }]);
    return { sheet: t(label).replace(/[\\/?:*\[\]]/g, '-').slice(0, 31), data };
  })).toBlob();
}

export async function downloadHistoryWorkbook(includeWithdrawn: boolean, t: TextTranslator, signal: AbortSignal) {
  const worker = new HistoryWorkerClient();
  const dispose = () => worker.dispose();
  signal.addEventListener('abort', dispose, { once: true });
  try {
    const groups = new Map<HistoryType, HistoryGroup[]>();
    const unavailable = new Set<HistoryType>();
    for (const [table] of HISTORY_TYPES) {
      signal.throwIfAborted();
      await worker.call({ action: 'begin', table });
      let cursor = '';
      let watermark: number | undefined;
      for (;;) {
        let page;
        try { page = await syncFocuses(table, cursor, watermark, signal); }
        catch (failure) {
          if (!cursor && isHistoryIndexUnavailable(table, failure)) {
            unavailable.add(table);
            await worker.call({ action: 'discard', table });
            break;
          }
          throw failure;
        }
        await worker.call({ action: 'stage', table, rows: page.rows, tasks: page.tasks });
        if (page.complete) break;
        cursor = page.cursor;
        watermark = page.watermark;
      }
      if (unavailable.has(table)) continue;
      await worker.call({ action: 'commit', table });
      const result = await worker.call<HistoryQueryResult>({ action: 'query', query: {
        table, search: '', includeWithdrawn, filters: {}, sort: 'detectionCount', direction: 'desc', page: 1, pageSize: maxDataRows,
      } });
      if (result.total > maxDataRows) throw new LocalizedError('history.exportTooLarge');
      groups.set(table, result.groups);
      await worker.call({ action: 'clear' });
    }
    const blob = await createHistoryWorkbook(groups, t, unavailable);
    signal.throwIfAborted();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    try {
      link.href = url;
      link.download = `${t('history.detectionHistory2312ad')}.xlsx`;
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } finally {
    signal.removeEventListener('abort', dispose);
    dispose();
  }
}
