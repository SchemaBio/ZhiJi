import type { AnalysisTask, TaskStatus } from '../../src/types/task';
import type { DataAsset } from '../../src/lib/data-assets';
import { oncologyPipelines } from '../../src/lib/oncology-pipelines';

const inputExamples = [
  { template: 'tumor_paired', genome: 'hg38', type: 'FFPE 肿瘤组织', cancer: '肺癌', site: '右肺上叶', statuses: ['completed', 'running', 'pending_interpretation'] },
  { template: 'tumor_paired', genome: 'hg19', type: '冷冻肿瘤组织', cancer: '结直肠癌', site: '乙状结肠', statuses: ['running', 'waiting_for_data', 'completed'] },
  { template: 'tumor_single', genome: 'hg19', type: 'FFPE 肿瘤组织', cancer: '乳腺癌', site: '左乳外上象限', statuses: ['pending_interpretation', 'failed', 'completed'] },
  { template: 'tumor_single', genome: 'hg38', type: '血浆', cancer: '胃癌', site: '', statuses: ['queued', 'completed', 'cancelled'] },
  { template: 'vcf2anno', genome: 'hg19', type: '肿瘤 DNA', cancer: '肝癌', site: '肝右叶', statuses: ['completed', 'pending_interpretation', 'failed'] },
  { template: 'vcf2anno', genome: 'hg38', type: '肿瘤 DNA', cancer: '黑色素瘤', site: '左前臂皮肤', statuses: ['completed', 'running', 'pending_interpretation'] },
  { template: 'rna_fusion', genome: 'hg19', type: '新鲜肿瘤组织', cancer: '肺癌', site: '左肺下叶', statuses: ['completed', 'failed', 'waiting_for_data'] },
  { template: 'rna_fusion', genome: 'hg38', type: '冷冻肿瘤组织', cancer: '甲状腺癌', site: '甲状腺右叶', statuses: ['queued', 'running', 'completed'] },
] as const satisfies readonly { template: string; genome: string; type: string; cancer: string; site: string; statuses: readonly TaskStatus[] }[];

const workflowNames: Record<string, string> = {
  tumor_paired: '配对样本分析', tumor_single: '单样本分析', vcf2anno: 'VCF 注释流程', rna_fusion: 'RNA 融合分析',
};

export interface PreviewSample {
  id: string;
  internal_id: string;
  gender: 'male' | 'female' | 'unknown';
  age?: number;
  sample_type: string;
  cancer_type: string;
  collection_site: string;
  clinical_diagnosis: string;
  batch: string;
  matched_pair: { r1_path: string; r2_path: string } | null;
  created_at: string;
  updated_at: string;
}

export const previewPipelineVersion = 'mock-v1';
export const singleInterpretationExampleId = 'preview-task-12';
const fixtures = Array.from({ length: 24 }, (_, index) => {
  const example = inputExamples[index % inputExamples.length];
  const status = example.statuses[Math.floor(index / inputExamples.length)];
  const workflow = oncologyPipelines.find(item => item.template === example.template && item.genome === example.genome)!;
  const cancer = index === 18 ? '弥漫大 B 细胞淋巴瘤' : example.cancer;
  const group = workflowNames[example.template];
  const pipeline = `${group} (${workflow.genome})`;
  const id = index === 0 ? 'preview-task' : 'preview-task-' + (index + 1);
  const isSingleInterpretationExample = id === singleInterpretationExampleId;
  const internalId = `DEMO-${String(index + 1).padStart(4, '0')}`;
  const createdAt = new Date(Date.UTC(2026, 10, 20, 1) - index * 3_600_000).toISOString();
  const dataKind = example.template === 'rna_fusion' ? 'RNA' : 'DNA';
  const hasReads = example.template !== 'vcf2anno' && status !== 'waiting_for_data';
  const makeReads = (prefix: string) => ({ r1_path: `/synthetic/${prefix}_R1.fastq.gz`, r2_path: `/synthetic/${prefix}_R2.fastq.gz` });
  const sample: PreviewSample = {
    id: index === 0 ? 'detail-preview' : `detail-preview-${index + 1}`,
    internal_id: internalId, gender: example.cancer === '乳腺癌' || index % 2 === 1 ? 'female' : 'male', age: 42 + index,
    sample_type: isSingleInterpretationExample ? 'FFPE 肿瘤组织' : example.type, cancer_type: cancer,
    collection_site: isSingleInterpretationExample ? '胃窦' : example.site,
    clinical_diagnosis: '合成样本，仅用于界面检查', batch: `DEMO-${String(index % 3 + 1).padStart(2, '0')}`,
    matched_pair: hasReads ? makeReads(`${internalId}_${dataKind}`) : null,
    created_at: createdAt, updated_at: createdAt,
  };
  const normalSample: PreviewSample | undefined = example.template === 'tumor_paired' ? {
    ...sample,
    id: `${sample.id}-normal`, internal_id: `${internalId}-N`, sample_type: '配对正常组织',
    clinical_diagnosis: '合成配对正常对照', matched_pair: hasReads ? makeReads(`${internalId}-N_DNA`) : null,
  } : undefined;
  const hasResults = status === 'completed' || status === 'pending_interpretation';
  const task = {
    id,
    name: `${pipeline} · ${internalId}`,
    sampleId: sample.id, internalId, pipeline, pipelineId: workflow.id, pipelineVersion: previewPipelineVersion,
    ...(normalSample ? { normalSampleId: normalSample.id, normalSampleInternalId: normalSample.internal_id } : {}),
    template: workflow.template, status, progress: hasResults ? 100 : status === 'running' ? 68 : 0,
    createdAt, completedAt: hasResults ? new Date(Date.parse(createdAt) + 3_600_000).toISOString() : undefined,
    attemptId: 'preview-attempt', resultImportStatus: hasResults ? 'success' : undefined,
    createdBy: '示例用户', executionPhase: hasResults || status === 'failed' || status === 'cancelled' ? 'terminal' : status,
    ...(example.template === 'vcf2anno' ? { resultCapabilities: ['snv_indel'] } : {}),
  } satisfies AnalysisTask;
  return { sample, normalSample, task, genome: workflow.genome };
});

export const previewTasks = fixtures.map(item => item.task);
export const previewSamples = fixtures.flatMap(({ sample, normalSample }) => normalSample ? [sample, normalSample] : [sample]);
export function findPreviewTaskFixture(id: string) {
  return fixtures.find(item => item.task.id === id);
}

export const previewTaskCounts = previewTasks.reduce<Partial<Record<TaskStatus, number>>>((counts, task) => {
  counts[task.status] = (counts[task.status] ?? 0) + 1;
  return counts;
}, {});

function makeAsset(id: string, name: string, readType: DataAsset['read_type'], genome: 'hg19' | 'hg38', sample?: PreviewSample): DataAsset {
  const date = sample?.created_at ?? previewSamples[0].created_at;
  return {
    id, file_name: name, read_type: readType, internal_id: sample?.internal_id,
    reference_genome: genome === 'hg19' ? 'GRCh37' : 'GRCh38',
    file_size: readType === 'bed' ? 1_000_000 : readType === 'vcf' ? 16 * 1024 ** 2 : 256 * 1024 ** 2,
    status: 'completed', validation_status: 'valid', provider: 's3', source: 'upload', created_at: date, updated_at: date,
  };
}

export const previewAssets: DataAsset[] = [
  ...fixtures.flatMap(({ sample, normalSample, task, genome }) => {
    if (task.template === 'vcf2anno') return [makeAsset(`preview-vcf-${sample.id}`, `${sample.internal_id}_${genome}.vcf.gz`, 'vcf', genome, sample)];
    return (normalSample ? [sample, normalSample] : [sample]).flatMap(item => item.matched_pair ? [
      makeAsset(`${item.id}-read1`, item.matched_pair.r1_path.split('/').at(-1)!, 'read1', genome, item),
      makeAsset(`${item.id}-read2`, item.matched_pair.r2_path.split('/').at(-1)!, 'read2', genome, item),
    ] : []);
  }),
  ...(['hg19', 'hg38'] as const).map(genome => makeAsset(`preview-bed-${genome}`, `合成肿瘤靶区_${genome}.bed`, 'bed', genome)),
];
