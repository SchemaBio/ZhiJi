import { describe, expect, it } from 'vitest';
import { getOncologyTabs, oncologyColumnValue, type OncologyResultRow } from './oncology-results';

import type { AnalysisTaskDetail, ResultContext } from './types';

describe('oncology table values', () => {
  const legacyFusion: OncologyResultRow = {
    id: 'fusion',
    values: { partners: 'EML4 → ALK', exons: 'Exon 13 → Exon 20' },
    details: { breakpoint5: 'chr2:42312000 (+)', breakpoint3: 'chr2:29224000 (−)', transcript: 'NM_019063.5 → NM_004304.5' },
  };

  it('splits legacy fusion components without attaching strand to the reported coordinates', () => {
    expect(['gene5', 'gene3', 'exon5', 'exon3', 'breakpoint5', 'breakpoint3', 'strand5', 'strand3', 'transcript5', 'transcript3']
      .map(key => oncologyColumnValue(legacyFusion, key))).toEqual([
      'EML4', 'ALK', 'Exon 13', 'Exon 20', 'chr2:42312000', 'chr2:29224000', '+', '−', 'NM_019063.5', 'NM_004304.5',
    ]);
    expect(oncologyColumnValue({ id: 'ambiguous', values: { partners: 'A → B → C' } }, 'gene5')).toBeUndefined();
  });

  it('preserves zero, explicit null and legacy detail-only metrics', () => {
    const row = { ...legacyFusion, values: { gene5: null, minorCopies: 0 }, details: { wildAffinity: 510 } };
    expect(oncologyColumnValue(row, 'gene5')).toBeNull();
    expect(oncologyColumnValue(row, 'minorCopies')).toBe(0);
    expect(oncologyColumnValue(row, 'wildAffinity')).toBe(510);
    expect(oncologyColumnValue(row, 'wildRank')).toBeUndefined();
  });
});

it('keeps germline out of explicit single-sample tasks even if the context carries stale paired results', () => {
  const context: ResultContext = {
    taskUuid: 'task', executionAttemptId: 'attempt', importStatus: 'success', state: 'ready', version: 'v1',
    reference: { available: true, declaredId: 'hg38' }, qc: [], permissions: { canReview: true, canFocus: true },
    members: [{ id: 'normal', role: 'normal' }],
    types: { 'snv-indel': { total: 2, reviewed: 0, focused: 0 } },
    oncology: { germline: { state: 'ready', total: 4 } },
  };
  const task: AnalysisTaskDetail = {
    template: 'tumor_single', pipelineId: 'builtin-tumor-single-hg38', normalSampleId: 'stale',
    id: 'task', name: 'test', sampleId: 'sample', internalId: 'DEMO', pipeline: 'single', pipelineVersion: 'v1',
    status: 'completed', createdAt: '', createdBy: '',
  };
  expect(getOncologyTabs(task, context)?.map(tab => tab.id)).toEqual(['snv-indel', 'chemotherapy']);
  expect(getOncologyTabs({ ...task, template: 'tumor_paired', pipelineId: 'builtin-tumor-paired-hg38' }, context)?.map(tab => tab.id))
    .toContain('germline');
});
