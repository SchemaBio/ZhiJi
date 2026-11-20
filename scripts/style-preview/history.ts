export { HistoryWorkerClient } from '../../src/app/(main)/history/history-client';
import type { HistoryAudit, HistorySync } from '../../src/app/(main)/history/history-client';
import type { FocusRow, HistoryType } from '../../src/app/(main)/history/history-engine';
import { ApiError } from './api';
import { previewTasks } from './oncology-fixtures';

const now = '2026-11-20T01:00:00Z';
const demoTask = previewTasks[0];
const tasks = {
  [demoTask.id]: {
    uuid: demoTask.id, name: demoTask.name, sampleId: demoTask.sampleId,
    internalId: demoTask.internalId, currentAttempt: demoTask.attemptId, pipeline: demoTask.pipeline,
  },
};
const rows: FocusRow[] = ['BRCA1', 'EGFR', 'TP53', 'KRAS', 'PIK3CA', 'BRAF'].map((gene, index) => {
  const classification = ['Pathogenic', 'Likely_Pathogenic', 'VUS', 'Likely_Benign', 'Benign', 'VUS'][index];
  return {
    id: `preview-focus-${index}`, revision: 1, table: 'snv-indel', taskUuid: 'preview-task',
    attemptId: 'preview-attempt', rowId: `demo-snv-${index}`, groupKey: `preview-locus-${index}`,
    reference: 'hg38', identityKnown: true,
    fields: { chromosome: String(index + 1), position: String(100000 + index * 37), ref: 'A', alt: 'G', gene },
    focused: index !== 5, classification, focusedClassification: classification,
    firstFocusedAt: now, lastFocusedAt: now, focusedBy: '示例用户', updatedAt: now,
    adjustmentVersion: 1, currentSource: true,
  };
});

export async function syncFocuses(table: HistoryType, cursor: string, _watermark: number | undefined, signal: AbortSignal): Promise<HistorySync> {
  signal.throwIfAborted();
  return { scope: 'preview', rows: cursor ? [] : rows.filter(row => row.table === table), tasks, cursor: 'complete', complete: true, watermark: 1 };
}

export async function focusDetail(id: string, signal: AbortSignal): Promise<{ row: FocusRow; events: HistoryAudit[] }> {
  signal.throwIfAborted();
  const row = rows.find(item => item.id === id);
  if (!row) throw new ApiError('找不到合成关注记录', 404);
  return { row, events: [{ id: `${id}-audit`, actor: row.focusedBy, createdAt: now, reason: '合成关注记录', before: {}, after: { focused: row.focused } }] };
}
