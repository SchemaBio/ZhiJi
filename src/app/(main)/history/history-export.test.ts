// @vitest-environment node
import readXlsxFile from 'read-excel-file/universal';
import { expect, it } from 'vitest';
import { chineseText } from '@/i18n/text';
import { HISTORY_TYPES, type HistoryGroup, type HistoryType } from './history-engine';
import { createHistoryWorkbook } from './history-export';

it('writes all history tabs as separate sheets and preserves identifiers as text', async () => {
  const variant: HistoryGroup = {
    id: 'germline-1', reference: 'hg19', identityKnown: true, locus: '13:16304 T>C', gene: '=BRCA2',
    classification: 'VUS', classificationCounts: { VUS: 1 }, detectionCount: 2,
    firstFocusedAt: '2026-11-06T01:00:00Z', lastFocusedAt: '2026-11-06T02:00:00Z',
    sourceCount: 2, withdrawnCount: 0, fields: { chromosome: '13', position: '16304', ref: 'T', alt: 'C', normalVaf: '48.3', genotype: '0/1' },
  };
  const groups = new Map<HistoryType, HistoryGroup[]>([['germline', [variant]]]);
  const sheets = await readXlsxFile(await createHistoryWorkbook(groups, chineseText, new Set(['fusion'])));
  expect(sheets.map(sheet => sheet.sheet)).toEqual(HISTORY_TYPES.map(([, label]) => chineseText(label).replace('/', '-')));
  expect(sheets[0].data).toHaveLength(1);
  const germline = sheets.find(sheet => sheet.sheet === chineseText('oncologyResults.germline'));
  expect(germline?.data[1]?.slice(0, 7)).toEqual(['13', '16304', 'T', 'C', '=BRCA2', '48.3', '0/1']);
  const fusion = sheets.find(sheet => sheet.sheet === chineseText('oncologyResults.fusion'));
  expect(fusion?.data[0]?.slice(0, 2)).toEqual(['5′ 基因', '3′ 基因']);
  expect(fusion?.data[1]?.[0]).toBe(chineseText('history.oncologyIndexUnavailable'));
});
