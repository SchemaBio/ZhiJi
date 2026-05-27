import { api } from './api';
import type { SampleDetail } from '@/app/(main)/samples/types';

type MaybeList<T> = T[] | { items?: T[]; list?: T[]; data?: T[] | { items?: T[]; list?: T[] } };

function unwrapList<T>(value: MaybeList<T>): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.list)) return value.list;
  if (Array.isArray(value.data)) return value.data;
  if (value.data && !Array.isArray(value.data)) {
    if (Array.isArray(value.data.items)) return value.data.items;
    if (Array.isArray(value.data.list)) return value.data.list;
  }
  return [];
}

function valueOf<T>(raw: Record<string, unknown>, camel: string, snake: string, fallback: T): T {
  return (raw[camel] ?? raw[snake] ?? fallback) as T;
}

export interface TaskSampleListItem {
  id: string;
  internalId: string;
  matchedPair: { r1Path?: string; r2Path?: string } | null;
}

export interface TaskPipelineOption {
  id: string;
  name: string;
  version: string;
  baseType?: string;
  template?: string;
  status?: string;
}

export interface TaskTemplateOption {
  name: string;
  path?: string;
  description?: string;
  inputFields?: string[];
}

function normalizeMatchedPair(raw: unknown): { r1Path?: string; r2Path?: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const pair = raw as Record<string, unknown>;
  return {
    r1Path: valueOf<string>(pair, 'r1Path', 'r1_path', ''),
    r2Path: valueOf<string>(pair, 'r2Path', 'r2_path', ''),
  };
}

export function normalizeSampleListItem(rawValue: unknown): TaskSampleListItem {
  const raw = (rawValue ?? {}) as Record<string, unknown>;
  return {
    id: String(raw.id ?? ''),
    internalId: valueOf<string>(raw, 'internalId', 'internal_id', ''),
    matchedPair: normalizeMatchedPair(raw.matchedPair ?? raw.matched_pair),
  };
}

export function normalizeSampleDetail(rawValue: unknown): SampleDetail {
  const raw = (rawValue ?? {}) as Record<string, unknown>;

  return {
    id: String(raw.id ?? ''),
    internalId: valueOf<string>(raw, 'internalId', 'internal_id', ''),
    batch: valueOf<string>(raw, 'batch', 'batch', ''),
    gender: valueOf<SampleDetail['gender']>(raw, 'gender', 'gender', 'unknown'),
    age: valueOf<number | undefined>(raw, 'age', 'age', undefined),
    birthDate: valueOf<string>(raw, 'birthDate', 'birth_date', ''),
    sampleType: valueOf<SampleDetail['sampleType']>(raw, 'sampleType', 'sample_type', '其他'),
    nucleicAcidType: valueOf<SampleDetail['nucleicAcidType']>(raw, 'nucleicAcidType', 'nucleic_acid_type', 'DNA'),
    tumorType: valueOf<string>(raw, 'tumorType', 'tumor_type', ''),
    pairedSampleId: valueOf<string | undefined>(raw, 'pairedSampleId', 'paired_sample_id', undefined),
    matchedPair: normalizeMatchedPair(raw.matchedPair ?? raw.matched_pair) as SampleDetail['matchedPair'],
    dataCount: valueOf<number>(raw, 'dataCount', 'data_count', 0),
    status: valueOf<SampleDetail['status']>(raw, 'status', 'status', 'pending'),
    remark: valueOf<string>(raw, 'remark', 'remark', ''),
    tumorInfo: valueOf<SampleDetail['tumorInfo']>(
      raw,
      'tumorInfo',
      'tumor_info',
      { tumorType: '' }
    ),
    sourceInfo: valueOf<SampleDetail['sourceInfo']>(
      raw,
      'sourceInfo',
      'source_info',
      { sampleSource: 'primary', samplingMethod: 'other', isPaired: false }
    ),
    treatmentInfo: valueOf<SampleDetail['treatmentInfo']>(
      raw,
      'treatmentInfo',
      'treatment_info',
      { hasPriorTreatment: false }
    ),
    testRequirement: valueOf<SampleDetail['testRequirement']>(
      raw,
      'testRequirement',
      'test_requirement',
      { testPurpose: 'other' }
    ),
    submissionInfo: valueOf<SampleDetail['submissionInfo']>(
      raw,
      'submissionInfo',
      'submission_info',
      { hospital: '', department: '', doctor: '', submissionDate: '', sampleCollectionDate: '', sampleReceiveDate: '', sampleQuality: 'acceptable' }
    ),
    projectInfo: valueOf<SampleDetail['projectInfo']>(
      raw,
      'projectInfo',
      'project_info',
      { projectId: '', projectName: '', testItems: [], turnaroundDays: 0, priority: 'normal' }
    ),
    analysisTasks: valueOf<SampleDetail['analysisTasks']>(raw, 'analysisTasks', 'analysis_tasks', []),
    createdAt: valueOf<string>(raw, 'createdAt', 'created_at', ''),
    updatedAt: valueOf<string>(raw, 'updatedAt', 'updated_at', ''),
  };
}

function normalizePipeline(rawValue: unknown): TaskPipelineOption {
  const raw = (rawValue ?? {}) as Record<string, unknown>;
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    version: String(raw.version ?? ''),
    baseType: valueOf<string | undefined>(raw, 'baseType', 'base_type', undefined),
    template: valueOf<string | undefined>(raw, 'template', 'template', undefined),
    status: String(raw.status ?? ''),
  };
}

function normalizeTemplate(rawValue: unknown): TaskTemplateOption {
  const raw = (rawValue ?? {}) as Record<string, unknown>;
  return {
    name: String(raw.name ?? ''),
    path: String(raw.path ?? ''),
    description: String(raw.description ?? ''),
    inputFields: valueOf<string[]>(raw, 'inputFields', 'input_fields', []),
  };
}

export const samplesApi = {
  async list(params?: { search?: string; page?: number; page_size?: number }): Promise<TaskSampleListItem[]> {
    const searchParams: Record<string, string> = {
      page: String(params?.page ?? 1),
      page_size: String(params?.page_size ?? 100),
    };
    if (params?.search) searchParams.search = params.search;
    const response = await api.get<MaybeList<unknown>>('/v1/samples', { params: searchParams });
    return unwrapList(response).map(normalizeSampleListItem).filter(sample => sample.id);
  },
};

export const pipelinesApi = {
  async list(): Promise<TaskPipelineOption[]> {
    const response = await api.get<MaybeList<unknown>>('/v1/pipelines', {
      params: { page: '1', page_size: '100' },
    });
    return unwrapList(response).map(normalizePipeline).filter(pipeline => pipeline.id && pipeline.name);
  },
};

export const templatesApi = {
  async list(): Promise<TaskTemplateOption[]> {
    const response = await api.get<MaybeList<unknown>>('/v1/templates');
    return unwrapList(response).map(normalizeTemplate).filter(template => template.name);
  },
};
