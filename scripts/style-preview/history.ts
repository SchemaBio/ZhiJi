export { HistoryWorkerClient } from '../../src/app/(main)/history/history-client';
import type { HistoryAudit, HistorySync } from '../../src/app/(main)/history/history-client';
import { HISTORY_TYPES, type FocusRow, type HistoryTask, type HistoryType } from '../../src/app/(main)/history/history-engine';
import { isOncologyResultTab, type OncologyResultRow } from '../../src/app/(main)/tasks/[uuid]/oncology-results';
import type { SNVIndel } from '../../src/app/(main)/tasks/[uuid]/types';
import { ApiError } from './api';
import { findPreviewTaskFixture, previewTasks } from './oncology-fixtures';
import { previewOncologyResults } from './oncology-results';
import { getPreviewReviewEvents, getPreviewSNVRows, isSeededPreviewFocus, readPreviewMark } from './results';

const activeTables = HISTORY_TYPES.map(([table]) => table);

function stringFields(row: OncologyResultRow, variant?: SNVIndel) {
  return Object.fromEntries(Object.entries({
    ...row.details, ...row.values,
    ...(variant ? {
      chromosome: variant.chromosome, position: variant.position > 0 ? variant.position : undefined,
      ref: variant.ref, alt: variant.alt, gene: variant.gene, transcript: variant.transcript,
      gnomadAF: variant.gnomadAF, locus: row.values.locus ?? variant.hgvsp,
    } : {}),
  }).filter((entry): entry is [string, string | number] => entry[1] != null && entry[1] !== '')
    .map(([key, value]) => [key, String(value)]));
}

function snapshot(table: HistoryType) {
  const rows: FocusRow[] = [];
  const tasks: Record<string, HistoryTask> = {};
  const audits = new Map<string, HistoryAudit[]>();
  if (table !== 'snv-indel' && !isOncologyResultTab(table)) return { rows, tasks, audits };
  for (const task of previewTasks) {
    if (task.resultImportStatus !== 'success') continue;
    const fixture = findPreviewTaskFixture(task.id);
    if (!fixture) continue;
    const entry: OncologyResultRow[] = table === 'snv-indel'
      ? getPreviewSNVRows(task.id).map(variant => ({ id: variant.id, values: {}, variant }))
      : previewOncologyResults(fixture)[table]?.rows ?? [];
    for (const row of entry) {
      const focused = readPreviewMark(task.id, table, row.id, 'focused');
      const seeded = isSeededPreviewFocus(task.id, table, row.id);
      const events = getPreviewReviewEvents(task.id, table, row.id);
      const focusEvents = events.filter(event => Object.hasOwn(event.after, 'focused'));
      if (!seeded && focusEvents.length === 0) continue;
      const selectedAt = focusEvents.filter(event => event.after.focused === true).map(event => event.createdAt);
      const base = task.completedAt || task.createdAt;
      const timestamps = [...(seeded ? [base] : []), ...selectedAt].sort();
      const recent = focusEvents[0];
      const fields = stringFields(row, row.variant);
      const identity = table === 'fusion' ? [fields.gene5, fields.gene3, fields.breakpoint5, fields.breakpoint3]
        : table === 'cnv-gene' ? [fields.gene, fields.position, fields.event]
        : table === 'cnv-chrom' ? [fields.chromosome, fields.interval, fields.event]
        : [fields.chromosome, fields.position, fields.ref, fields.alt];
      const identityKnown = identity.every(Boolean);
      const id = [task.id, table, row.id].join(':');
      const classification = row.variant?.acmgClassification || fields.classification || fields.tier || '';
      const revision = Math.max(Date.parse(base), recent ? Date.parse(recent.createdAt) : 0) + focusEvents.length;
      rows.push({
        id, revision, table, taskUuid: task.id, attemptId: task.attemptId, rowId: row.id,
        groupKey: identityKnown ? JSON.stringify([fixture.genome, ...identity]) : id,
        reference: fixture.genome, identityKnown, fields, focused, classification, focusedClassification: classification,
        firstFocusedAt: timestamps[0] ?? null, lastFocusedAt: timestamps.at(-1) ?? null,
        focusedBy: recent?.actor || '示例用户', updatedAt: recent?.createdAt || base,
        adjustmentVersion: events.length + 1, currentSource: true,
      });
      audits.set(id, events.length ? events : [{ id: id + ':seed', actor: '示例用户', createdAt: base, reason: '合成关注记录', before: {}, after: { focused: true } }]);
      tasks[task.id] = {
        uuid: task.id, name: task.name, sampleId: task.sampleId, internalId: task.internalId,
        currentAttempt: task.attemptId, pipeline: task.pipeline, template: task.template,
      };
    }
  }
  return { rows, tasks, audits };
}

export async function syncFocuses(table: HistoryType, cursor: string, _watermark: number | undefined, signal: AbortSignal): Promise<HistorySync> {
  signal.throwIfAborted();
  const { rows, tasks } = snapshot(table);
  const prior = Number(cursor) || 0;
  const watermark = rows.reduce((max, row) => Math.max(max, row.revision), prior);
  return { scope: 'preview', rows: rows.filter(row => row.revision > prior), tasks, cursor: String(watermark), complete: true, watermark };
}

export async function focusDetail(id: string, signal: AbortSignal): Promise<{ row: FocusRow; events: HistoryAudit[] }> {
  signal.throwIfAborted();
  for (const table of activeTables) {
    const { rows, audits } = snapshot(table);
    const row = rows.find(candidate => candidate.id === id);
    if (row) return { row, events: audits.get(id) ?? [] };
  }
  throw new ApiError('找不到合成关注记录', 404);
}
