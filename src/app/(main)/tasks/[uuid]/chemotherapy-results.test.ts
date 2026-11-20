import { expect, it } from 'vitest';
import { mergeChemotherapyRows } from './chemotherapy-results';
import type { OncologyResultRow } from './oncology-results';

const result: OncologyResultRow = {
  id: 'dpyd-result', guidelineMarkerId: 'DPYD:*2A:variant', pgxForwardGenotype: 'C/T',
  values: { gene: 'DPYD', locus: 'rs3918290', genotype: 'C/T', status: 'oncologyResults.detected' },
};

it('merges a verified sample call with its original ClinPGx evidence in one row', () => {
  const rows = mergeChemotherapyRows([result], 'ready');
  const matches = rows.filter(row => row.values.locus === 'rs3918290');
  expect(matches).toHaveLength(1);
  expect(matches[0].values).toMatchObject({
    genotype: 'C/T', marker: '*2A', toxicityRisk: 'chemotherapyCatalog.elevatedRisk',
    efficacy: 'chemotherapyCatalog.efficacyNotEstablished',
  });
  expect(matches[0].sources.map(source => source.href)).toContain('https://www.clinpgx.org/clinicalAnnotation/827843617');
});

it('preserves untested and proxy rows without deriving a sample risk', () => {
  const untested = mergeChemotherapyRows([], 'notRun');
  expect(untested).toHaveLength(15);
  expect(untested.every(row => row.values.status === 'oncologyResults.notRun')).toBe(true);
  const rows = mergeChemotherapyRows([{
    ...result, guidelineMarkerId: 'DPYD:HapB3:proxy', pgxPhenotypeCode: 'poor', pgxPhenotypeScope: 'DPYD',
    values: { ...result.values, locus: 'rs56038477' },
  }], 'ready');
  expect(rows.find(row => row.id === result.id)?.values.toxicityRisk).toBe('chemotherapyCatalog.riskUnassessed');
});

it('keeps an ambiguous TPMT marker as a separate result without assigning a haplotype', () => {
  const rows = mergeChemotherapyRows([{
    id: 'ambiguous', values: { gene: 'TPMT', locus: 'rs1800460', genotype: 'G/A' },
  }], 'ready');
  expect(rows).toHaveLength(16);
  const record = rows.find(row => row.id === 'ambiguous');
  expect(record?.marker).toBeUndefined();
  expect(record?.values.toxicityRisk).toBe('chemotherapyCatalog.riskUnassessed');
});
