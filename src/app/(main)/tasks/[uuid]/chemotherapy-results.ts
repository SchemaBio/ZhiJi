import { chemotherapyGuidelines, chemotherapyGuidelineMarkers, chemotherapyMarkerId, type ReferenceMarker } from '@/lib/chemotherapy-guidelines';
import { chemotherapyClinpgxEvidence, chemotherapyGenotypeExample } from '@/lib/chemotherapy-clinpgx';
import { oncologyColumnValue, type OncologyModuleState, type OncologyResultRow, type OncologyValue } from './oncology-results';

export interface ChemotherapyRow extends OncologyResultRow {
  marker?: ReferenceMarker;
  sources: { href: string; label: string; category?: 'toxicity' | 'efficacy' }[];
}

const catalogLabel = (key: string) => 'chemotherapyCatalog.' + key;

function findMarker(row: OncologyResultRow) {
  const gene = oncologyColumnValue(row, 'gene');
  if (row.guidelineMarkerId) {
    return chemotherapyGuidelineMarkers.find(marker => marker.gene === gene && chemotherapyMarkerId(marker) === row.guidelineMarkerId);
  }
  const locus = oncologyColumnValue(row, 'locus');
  const candidates = chemotherapyGuidelineMarkers.filter(marker =>
    marker.gene === gene && typeof locus === 'string' && marker.rsIds.includes(locus));
  const [candidate] = candidates;
  return candidates.length === 1 && candidate.type === 'variant' ? candidate : undefined;
}

function toxicityRisk(result: OncologyResultRow, marker: ReferenceMarker | undefined) {
  const existing = oncologyColumnValue(result, 'toxicityRisk');
  if (existing !== undefined || !marker || marker.type === 'proxy') return existing;
  const status = oncologyColumnValue(result, 'status');
  if (status != null && status !== 'oncologyResults.detected' && status !== 'chemotherapyCatalog.resultProvided'
    && status !== 'oncologyResults.ready') return undefined;

  const scope = marker.guideline === 'thiopurines' ? 'TPMT+NUDT15' : marker.gene;
  if (result.pgxPhenotypeScope === scope && result.pgxPhenotypeCode) {
    return catalogLabel(result.pgxPhenotypeCode === 'normal' ? 'relativeLowerRisk' : 'elevatedRisk');
  }
  const example = chemotherapyGenotypeExample(marker.rsIds[0]);
  const genotype = result.pgxForwardGenotype?.replace(/[\s/|]/g, '').toUpperCase().split('').sort().join('');
  if (genotype && example) {
    if (example.lower === genotype) return catalogLabel('relativeLowerRisk');
    if (example.elevated.split(' / ').includes(genotype)) return catalogLabel('elevatedRisk');
  }
  return undefined;
}

function tableRow(availability: OncologyModuleState, marker?: ReferenceMarker, result?: OncologyResultRow): ChemotherapyRow {
  const guideline = marker && chemotherapyGuidelines[marker.guideline];
  const publications = marker ? chemotherapyClinpgxEvidence(marker.gene, marker.name, marker.rsIds[0]) : [];
  const sources: ChemotherapyRow['sources'] = publications.map(record => ({
    href: 'https://www.clinpgx.org/clinicalAnnotation/' + record.id,
    label: 'ClinPGx ' + record.level + ' · ' + record.id,
    category: record.category,
  }));
  if (guideline) sources.push({ href: guideline.url, label: guideline.label });
  const example = marker && (chemotherapyGenotypeExample(marker.rsIds[0]) ??
    (marker.gene !== 'DPYD' ? { lower: '*1/*1', elevated: '*1/' + marker.name + ' / ' + marker.name + '/' + marker.name } : undefined));
  const status = result ? oncologyColumnValue(result, 'status') ?? catalogLabel('resultProvided')
    : availability === 'notRun' ? 'oncologyResults.notRun' : catalogLabel('noSampleResult');
  const referenceStatus = marker ? catalogLabel('efficacyNotEstablished') : undefined;
  const toxicity = result ? toxicityRisk(result, marker) : undefined;
  const values: Record<string, OncologyValue> = {
    ...(marker ? {
      gene: marker.gene, locus: marker.rsIds.join(', '), marker: marker.name,
      markerType: catalogLabel(marker.type),
    } : {}),
    ...result?.values,
    ...(guideline && { guideline: guideline.label }),
    status,
    efficacy: (result && oncologyColumnValue(result, 'efficacy')) ?? referenceStatus ?? null,
    toxicityRisk: toxicity ?? catalogLabel('riskUnassessed'),
  };
  return {
    ...result,
    id: result?.id ?? 'guide:' + chemotherapyMarkerId(marker!),
    values,
    marker,
    sources,
    details: {
      ...(marker?.definition ? { hgvs: marker.definition } : {}),
      ...result?.details,
      ...(guideline && { guideline: guideline.label }),
      ...(example ? { lowerRiskGenotypes: example.lower, elevatedRiskGenotypes: example.elevated } : {}),
      ...(marker?.type === 'proxy' ? { proxyEvidence: catalogLabel('proxyEvidence') } : {}),
    },
  };
}

export function mergeChemotherapyRows(results: OncologyResultRow[], availability: OncologyModuleState) {
  const matched = new Map<ReferenceMarker, OncologyResultRow[]>();
  const unmatched: OncologyResultRow[] = [];
  for (const row of results) {
    const marker = findMarker(row);
    if (!marker) { unmatched.push(row); continue; }
    const linked = matched.get(marker) ?? [];
    linked.push(row);
    matched.set(marker, linked);
  }
  return [
    ...chemotherapyGuidelineMarkers.flatMap(marker => {
      const records = matched.get(marker);
      return records ? records.map(row => tableRow(availability, marker, row)) : [tableRow(availability, marker)];
    }),
    ...unmatched.map(row => tableRow(availability, undefined, row)),
  ];
}
