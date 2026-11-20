import type { AnalysisTaskDetail, ResultContext, SNVIndel, TabConfig } from './types';

export const SNV_INDEL_LABEL = 'SNV/InDel';

const modules = {
  'cnv-gene': { label: 'cnvGene', columns: ['gene', 'event', 'copies', 'logRatio', 'scope', 'qc'], filters: ['event', 'qc'] },
  fusion: { label: 'fusion', columns: ['partners', 'exons', 'source', 'frame', 'splitReads', 'spanningPairs', 'review'], filters: ['source', 'review'] },
  chemotherapy: { label: 'chemotherapy', columns: ['gene', 'locus', 'genotype', 'phenotype', 'drug', 'evidence'], filters: ['source'] },
  hotspot: { label: 'hotspot', columns: ['gene', 'locus', 'status', 'depth', 'tumorVaf', 'related'], filters: ['status'] },
  biomarkers: { label: 'biomarkers', columns: ['metric', 'result', 'interpretation', 'status', 'method'], filters: ['status'] },
  'cnv-chrom': { label: 'cnvChrom', columns: ['chromosome', 'event', 'interval', 'length', 'fraction', 'copies'], filters: ['event'] },
  neoantigen: { label: 'neoantigen', columns: ['variant', 'peptide', 'hla', 'affinity', 'rank', 'expression'], filters: ['hla'] },
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
export interface OncologyResultRow {
  id: string;
  values: Record<string, OncologyValue>;
  variant?: SNVIndel;
  focused?: boolean;
  pinned?: boolean;
  adjustmentVersion?: number;
  details?: Record<string, OncologyValue>;
  related?: Array<{ tab: OncologyResultTab; id: string; label: string } | { tab: 'snv-indel'; id: string; label: string; locus: SNVResultLocus }>;
}

export interface OncologyResultTable {
  rows: OncologyResultRow[];
  attemptId?: string;
  datasetVersion?: string;
}

export function isPairedOncologyTask(task: Pick<AnalysisTaskDetail, 'template' | 'pipelineId' | 'normalSampleId' | 'normalSampleInternalId'>, context?: ResultContext | null) {
  return Boolean(task.normalSampleId || task.normalSampleInternalId || context?.members?.some(member => member.role === 'normal')) || task.template === 'tumor_paired' || /^builtin-tumor-paired-hg(?:19|38)$/.test(task.pipelineId ?? '');
}

export function isRnaFusionTask(task: Pick<AnalysisTaskDetail, 'template' | 'pipelineId'>) {
  return task.template === 'rna_fusion' || /^builtin-rna-fusion-hg(?:19|38)$/.test(task.pipelineId ?? '');
}

export function getOncologyTabs(task: AnalysisTaskDetail, context: ResultContext | null): TabConfig[] | undefined {
  const paired = isPairedOncologyTask(task, context);
  const rna = isRnaFusionTask(task);
  const single = task.template === 'tumor_single' || /^builtin-tumor-single-hg(?:19|38)$/.test(task.pipelineId ?? '');
  const vcf = task.template === 'vcf2anno';
  if (!paired && !rna && !single && !vcf && !context?.oncology) return undefined;
  return oncologyTabs.filter(tab => {
    if (tab === 'germline') return paired;
    if (tab === 'snv-indel') return vcf || Boolean(context?.types?.[tab] || context?.parquet?.tables.includes(tab));
    return Boolean(context?.oncology?.[tab]);
  }).map(id => ({
    id,
    label: id === 'snv-indel' ? SNV_INDEL_LABEL : 'oncologyResults.' + modules[id].label,
  }));
}
