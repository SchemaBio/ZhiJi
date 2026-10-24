import { readResourcePages } from './resource-pages';

export interface Pipeline {
  id: string;
  name: string;
  basePipelineId: string;
  baseType: string;
  version: string;
  description: string;
  bedFile: string;
  referenceGenome: string;
  cnvBaseline: string;
  status: 'active' | 'inactive';
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function rawString(raw: Record<string, unknown>, camel: string, snake: string, fallback = ''): string {
  const value = raw[camel] ?? raw[snake];
  return typeof value === 'string' ? value : fallback;
}

export function normalizePipeline(value: unknown): Pipeline {
  const raw = asRecord(value);
  const status = rawString(raw, 'status', 'status', 'inactive');
  return {
    id: String(raw.id ?? ''),
    name: rawString(raw, 'name', 'name'),
    basePipelineId: rawString(raw, 'basePipelineId', 'base_pipeline_id'),
    baseType: rawString(raw, 'baseType', 'base_type'),
    version: rawString(raw, 'version', 'version'),
    description: rawString(raw, 'description', 'description'),
    bedFile: rawString(raw, 'bedFile', 'bed_file'),
    referenceGenome: rawString(raw, 'referenceGenome', 'reference_genome'),
    cnvBaseline: rawString(raw, 'cnvBaseline', 'cnv_baseline'),
    status: status === 'active' ? 'active' : 'inactive',
    isBuiltin: Boolean(raw.isBuiltin ?? raw.is_builtin),
    createdAt: rawString(raw, 'createdAt', 'created_at'),
    updatedAt: rawString(raw, 'updatedAt', 'updated_at'),
  };
}

export async function listPipelines(search = ''): Promise<Pipeline[]> {
  const rows = await readResourcePages<unknown>('/v1/pipelines', search ? { search } : {});
  return rows.map(normalizePipeline).filter((pipeline) => pipeline.id);
}
