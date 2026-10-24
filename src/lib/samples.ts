import { api } from './api';
import { readResourcePages } from './resource-pages';
import type { Gender, NucleicAcidType, Sample, SampleStatus, SampleType } from '@/app/(main)/samples/types';

const SAMPLE_TYPES: SampleType[] = ['FFPE', '新鲜组织', '全血', 'cfDNA', '胸腹水', '骨髓', '其他'];
const SAMPLE_STATUSES: SampleStatus[] = ['pending', 'matched', 'analyzing', 'completed'];

export interface SampleWriteInput {
  internalId: string;
  gender: Gender;
  age?: number;
  sampleType: string;
  batch: string;
  remark: string;
  clinicalDiagnosis?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function rawString(raw: Record<string, unknown>, camel: string, snake: string, fallback = ''): string {
  const value = raw[camel] ?? raw[snake];
  return typeof value === 'string' ? value : fallback;
}

function rawNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function sharedPayload(input: SampleWriteInput) {
  return {
    internal_id: input.internalId.trim(),
    gender: input.gender,
    ...(input.age !== undefined ? { age: input.age } : {}),
    sample_type: input.sampleType,
    batch: input.batch,
    remark: input.remark,
    clinical_diagnosis: input.clinicalDiagnosis ?? '',
  };
}

export function normalizeSample(value: unknown): Sample {
  const raw = asRecord(value);
  const genderValue = raw.gender;
  const gender: Gender = genderValue === 'male' || genderValue === 'female' || genderValue === 'unknown' ? genderValue : 'unknown';
  const sampleTypeValue = rawString(raw, 'sampleType', 'sample_type', '其他');
  const sampleType = SAMPLE_TYPES.includes(sampleTypeValue as SampleType) ? sampleTypeValue as SampleType : '其他';
  const statusValue = rawString(raw, 'status', 'status', 'pending');
  const status = SAMPLE_STATUSES.includes(statusValue as SampleStatus) ? statusValue as SampleStatus : 'pending';
  const nucleic = rawString(raw, 'nucleicAcidType', 'nucleic_acid_type', 'DNA');
  const nucleicAcidType: NucleicAcidType = nucleic === 'RNA' ? 'RNA' : 'DNA';
  const r1 = rawString(asRecord(raw.matchedPair ?? raw.matched_pair), 'r1Path', 'r1_path');
  const r2 = rawString(asRecord(raw.matchedPair ?? raw.matched_pair), 'r2Path', 'r2_path');
  const paired = rawString(raw, 'pairedSampleId', 'paired_sample_id');
  return {
    id: String(raw.id ?? ''),
    internalId: rawString(raw, 'internalId', 'internal_id'),
    batch: rawString(raw, 'batch', 'batch'),
    gender,
    age: rawNumber(raw.age),
    birthDate: rawString(raw, 'birthDate', 'birth_date'),
    sampleType,
    nucleicAcidType,
    tumorType: rawString(raw, 'tumorType', 'tumor_type'),
    pairedSampleId: paired || undefined,
    matchedPair: r1 && r2 ? { r1Path: r1, r2Path: r2 } : null,
    dataCount: rawNumber(raw.dataCount ?? raw.data_count) ?? 0,
    status,
    createdAt: rawString(raw, 'createdAt', 'created_at'),
    updatedAt: rawString(raw, 'updatedAt', 'updated_at'),
    remark: rawString(raw, 'remark', 'remark'),
  };
}

export async function listSamples(search = ''): Promise<Sample[]> {
  const rows = await readResourcePages<unknown>('/v1/samples', search ? { search } : {});
  return rows.map(normalizeSample).filter((sample) => sample.id);
}

export async function createSample(input: SampleWriteInput): Promise<Sample> {
  return normalizeSample(await api.post('/v1/samples', sharedPayload(input)));
}

export async function updateSample(id: string, input: SampleWriteInput): Promise<Sample> {
  return normalizeSample(await api.put(`/v1/samples/${encodeURIComponent(id)}`, sharedPayload(input)));
}

export async function deleteSample(id: string): Promise<void> {
  await api.delete(`/v1/samples/${encodeURIComponent(id)}`);
}
