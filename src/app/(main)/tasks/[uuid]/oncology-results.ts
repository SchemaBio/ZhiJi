import type { AnalysisTaskDetail, ResultContext, SNVIndel, TabConfig } from './types';

export const SNV_INDEL_LABEL = 'SNV/InDel';

const modules = {
  'cnv-gene': { label: 'cnvGene', columns: ['gene', 'event', 'copies', 'minorCopies', 'logRatio', 'loh', 'geneCoverage', 'scope', 'tier', 'qc'], optionalColumns: ['position', 'exons', 'majorCopies', 'supportingBins', 'purity', 'ploidy'], filters: ['event', 'loh', 'tier', 'qc'] },
  fusion: { label: 'fusion', columns: ['gene5', 'gene3', 'exon5', 'exon3', 'breakpoint5', 'breakpoint3', 'frame', 'splitReads', 'spanningPairs', 'confidence', 'source', 'review'], optionalColumns: ['transcript5', 'transcript3', 'strand5', 'strand3', 'domains', 'tier'], filters: ['source', 'frame', 'confidence', 'review'] },
  chemotherapy: { label: 'chemotherapy', columns: ['gene', 'locus', 'genotype', 'activityScore', 'phenotype', 'drug', 'sampleSource', 'evidence'], optionalColumns: ['hgvs', 'alleleFunction', 'guidelineVersion', 'assaySample', 'qc'], filters: ['sampleSource', 'phenotype', 'drug'] },
  hotspot: { label: 'hotspot', columns: ['gene', 'locus', 'status', 'depth', 'tumorVaf', 'related'], filters: ['status'] },
  biomarkers: { label: 'biomarkers', columns: ['metric', 'result', 'interpretation', 'status', 'method'], optionalColumns: ['threshold', 'analyzableSites', 'analyzableMb', 'variantCount', 'confidence'], filters: ['status'] },
  'cnv-chrom': { label: 'cnvChrom', columns: ['chromosome', 'event', 'interval', 'length', 'fraction', 'copies', 'minorCopies', 'logRatio', 'loh', 'qc'], optionalColumns: ['majorCopies', 'segmentCount', 'supportingBins', 'baf', 'purity', 'ploidy'], filters: ['event', 'loh', 'qc'] },
  neoantigen: { label: 'neoantigen', columns: ['variant', 'peptide', 'hla', 'affinity', 'rank', 'wildAffinity', 'wildRank', 'expression'], optionalColumns: ['wildPeptide', 'peptideLength', 'tumorVaf', 'rnaVaf', 'rnaDepth', 'method'], filters: ['hla'] },
  germline: { label: 'germline', columns: ['gene', 'variant', 'genotype', 'normalVaf', 'normalDepth', 'classification', 'review'], filters: ['classification', 'review'] },
} as const;

export type OncologyResultTab = keyof typeof modules;
export const oncologyReviewTables: ReadonlySet<OncologyResultTab> = new Set(['fusion', 'hotspot', 'cnv-gene', 'cnv-chrom', 'germline']);
export type OncologyTab = 'snv-indel' | OncologyResultTab;
export interface SNVResultLocus { chromosome: string; position: number }
export const oncologyResultModules = modules;
const oncologyTabs = ['snv-indel', ...Object.keys(modules)] as OncologyTab[];
export function isOncologyResultTab(value: string | null): value is OncologyResultTab {
  return value !== null && Object.hasOwn(modules, value);
}

export type OncologyModuleState = 'ready' | 'pending' | 'notRun' | 'unavailable';
export interface OncologyResultSummary {
  state: OncologyModuleState;
  total?: number;
}

export type OncologyValue = string | number | null;
export interface OncologyCNVSegment {
  chromosome: string;
  start: number;
  end: number;
  logRatio?: number | null;
  copies?: number | null;
  minorCopies?: number | null;
}

export interface OncologyResultRow {
  id: string;
  values: Record<string, OncologyValue>;
  variant?: SNVIndel;
  guidelineMarkerId?: string;
  pgxForwardGenotype?: string;
  pgxPhenotypeCode?: 'normal' | 'intermediate' | 'poor';
  pgxPhenotypeScope?: 'DPYD' | 'UGT1A1' | 'TPMT+NUDT15';
  focused?: boolean;
  pinned?: boolean;
  adjustmentVersion?: number;
  details?: Record<string, OncologyValue>;
  cnvSegments?: OncologyCNVSegment[];
  related?: Array<{ tab: OncologyResultTab; id: string; label: string } | { tab: 'snv-indel'; id: string; label: string; locus: SNVResultLocus }>;
}

// Older fusion results combined both partners. Recover each side only from an unambiguous pair.
const fusionPairFields: Record<string, [key: string, side: 0 | 1]> = {
  gene5: ['partners', 0], gene3: ['partners', 1],
  exon5: ['exons', 0], exon3: ['exons', 1],
  transcript5: ['transcript', 0], transcript3: ['transcript', 1],
};

export function oncologyColumnValue(row: OncologyResultRow, key: string): OncologyValue | undefined {
  if (key === 'breakpoint5' || key === 'breakpoint3' || key === 'strand5' || key === 'strand3') {
    const direct = Object.hasOwn(row.values, key) ? row.values[key] : row.details?.[key];
    if (key.startsWith('breakpoint')) return typeof direct === 'string' ? direct.replace(/\s+\([+−-]\)$/, '') : direct;
    if (direct !== undefined) return direct;
    const breakpoint = key === 'strand5' ? 'breakpoint5' : 'breakpoint3';
    const value = row.values[breakpoint] ?? row.details?.[breakpoint];
    return typeof value === 'string' ? value.match(/\s+\(([+−-])\)$/)?.[1] : undefined;
  }
  if (Object.hasOwn(row.values, key)) return row.values[key];
  if (Object.hasOwn(row.details ?? {}, key)) return row.details?.[key];
  if (key === 'sampleSource') return row.values.source ?? row.details?.source;
  const field = Object.hasOwn(fusionPairFields, key) ? fusionPairFields[key] : undefined;
  if (!field) return undefined;
  const combined = row.values[field[0]] ?? row.details?.[field[0]];
  if (typeof combined !== 'string') return undefined;
  const parts = combined.split(/\s*(?:→|->)\s*/);
  return parts.length === 2 ? parts[field[1]].trim() : undefined;
}

export interface OncologyResultTable {
  rows: OncologyResultRow[];
  attemptId?: string;
  datasetVersion?: string;
}

export function isSingleOncologyTask(task: Pick<AnalysisTaskDetail, 'template' | 'pipelineId'>) {
  return task.template === 'tumor_single' || /^builtin-tumor-single-hg(?:19|38)$/.test(task.pipelineId ?? '');
}

export function isPairedOncologyTask(task: Pick<AnalysisTaskDetail, 'template' | 'pipelineId' | 'normalSampleId' | 'normalSampleInternalId'>, context?: ResultContext | null) {
  if (isSingleOncologyTask(task)) return false;
  return Boolean(task.normalSampleId || task.normalSampleInternalId || context?.members?.some(member => member.role === 'normal')) || task.template === 'tumor_paired' || /^builtin-tumor-paired-hg(?:19|38)$/.test(task.pipelineId ?? '');
}

export function isRnaFusionTask(task: Pick<AnalysisTaskDetail, 'template' | 'pipelineId'>) {
  return task.template === 'rna_fusion' || /^builtin-rna-fusion-hg(?:19|38)$/.test(task.pipelineId ?? '');
}

export function getOncologyTabs(task: AnalysisTaskDetail, context: ResultContext | null): TabConfig[] | undefined {
  const paired = isPairedOncologyTask(task, context);
  const rna = isRnaFusionTask(task);
  const single = isSingleOncologyTask(task);
  const vcf = task.template === 'vcf2anno';
  if (!paired && !rna && !single && !vcf && !context?.oncology) return undefined;
  return oncologyTabs.filter(tab => {
    if (tab === 'germline') return paired;
    if (tab === 'chemotherapy' && (paired || single)) return true;
    if (tab === 'snv-indel') return vcf || Boolean(context?.types?.[tab] || context?.parquet?.tables.includes(tab));
    return Boolean(context?.oncology?.[tab]);
  }).map(id => ({
    id,
    label: id === 'snv-indel' ? SNV_INDEL_LABEL : 'oncologyResults.' + modules[id].label,
  }));
}
