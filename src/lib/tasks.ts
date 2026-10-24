import { api } from './api';
import type {
  AnalysisTask,
  AnalysisTaskDetail,
  TaskCreateRequest,
  TaskListResponse,
  TaskStatsResponse,
  TaskStatus,
  TaskUpdateRequest,
} from '@/types/task';

const TASK_STATUSES: TaskStatus[] = [
  'waiting_for_data',
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'pending_interpretation',
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function rawString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

function normalizeStatus(value: unknown): TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus) ? value as TaskStatus : 'queued';
}

export function normalizeTask(value: unknown): AnalysisTask {
  const raw = asRecord(value);
  return {
    id: String(raw.id ?? ''),
    name: typeof raw.name === 'string' ? raw.name : undefined,
    sampleId: rawString(raw, 'sampleId', 'sample_id'),
    internalId: rawString(raw, 'internalId', 'internal_id'),
    template: typeof raw.template === 'string' ? raw.template : undefined,
    pipeline: rawString(raw, 'pipeline'),
    pipelineVersion: rawString(raw, 'pipelineVersion', 'pipeline_version'),
    status: normalizeStatus(raw.status),
    vmStatus: rawString(raw, 'vmStatus', 'vm_status') || undefined,
    resultImportStatus: rawString(raw, 'resultImportStatus', 'result_import_status') || undefined,
    executionPhase: rawString(raw, 'executionPhase', 'execution_phase') || undefined,
    executionReasonCode: rawString(raw, 'executionReasonCode', 'execution_reason_code') || undefined,
    attemptId: rawString(raw, 'attemptId', 'attempt_id') || undefined,
    progress: typeof raw.progress === 'number' && Number.isFinite(raw.progress) ? raw.progress : 0,
    createdAt: rawString(raw, 'createdAt', 'created_at'),
    createdBy: rawString(raw, 'createdBy', 'created_by'),
    retryStartedAt: rawString(raw, 'retryStartedAt', 'retry_started_at') || undefined,
    interpretationCompletedAt: rawString(raw, 'interpretationCompletedAt', 'interpretation_completed_at') || undefined,
    interpretationCompletedBy: rawString(raw, 'interpretationCompletedBy', 'interpretation_completed_by') || undefined,
    completedAt: rawString(raw, 'completedAt', 'completed_at') || undefined,
    remark: typeof raw.remark === 'string' ? raw.remark : undefined,
  };
}

function taskItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const payload = asRecord(value);
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  const nested = asRecord(payload.data);
  return Array.isArray(nested.items) ? nested.items : [];
}

export function normalizeTaskListResponse(value: unknown, fallbackPage = 1, fallbackPageSize = 20): TaskListResponse {
  const items = taskItems(value).map(normalizeTask).filter((task) => task.id);
  const payload = asRecord(value);
  const meta = asRecord(payload.data && !Array.isArray(payload.data) ? payload.data : payload);
  return {
    items,
    total: typeof meta.total === 'number' ? meta.total : items.length,
    page: typeof meta.page === 'number' ? meta.page : fallbackPage,
    page_size: typeof meta.page_size === 'number' ? meta.page_size : fallbackPageSize,
    total_pages: typeof meta.total_pages === 'number' ? meta.total_pages : 1,
  };
}

export const tasksApi = {
  list(params?: { status?: string; sampleId?: string; page?: number; page_size?: number; search?: string }): Promise<TaskListResponse> {
    const searchParams: Record<string, string> = {};
    if (params?.status && params.status !== 'all') searchParams.status = params.status;
    if (params?.sampleId) searchParams.sampleId = params.sampleId;
    if (params?.page) searchParams.page = String(params.page);
    if (params?.page_size) searchParams.page_size = String(params.page_size);
    if (params?.search) searchParams.search = params.search;
    return api.get<unknown>('/v1/tasks', { params: searchParams, cache: 'no-store' })
      .then((response) => normalizeTaskListResponse(response, params?.page ?? 1, params?.page_size ?? 50));
  },

  async create(data: TaskCreateRequest): Promise<AnalysisTask> {
    return normalizeTask(await api.post('/v1/tasks', {
      sample_id: data.sampleId,
      internal_id: data.internalId,
      pipeline_id: data.pipelineId,
      pipeline_name: data.pipelineName,
      pipeline_version: data.pipelineVersion,
      remark: data.remark,
    }));
  },

  async get(id: string): Promise<AnalysisTaskDetail> {
    const task = normalizeTask(await api.get(`/v1/tasks/${encodeURIComponent(id)}`, { cache: 'no-store' }));
    return { ...task, name: task.name || task.internalId || task.id };
  },

  async update(id: string, data: TaskUpdateRequest): Promise<AnalysisTask> {
    return normalizeTask(await api.put(`/v1/tasks/${encodeURIComponent(id)}`, {
      internal_id: data.internalId,
      pipeline: data.pipeline,
      remark: data.remark,
    }));
  },

  async start(id: string): Promise<AnalysisTask> {
    return normalizeTask(await api.post(`/v1/tasks/${encodeURIComponent(id)}/start`));
  },

  async stop(id: string): Promise<AnalysisTask> {
    return normalizeTask(await api.post(`/v1/tasks/${encodeURIComponent(id)}/stop`));
  },

  async retry(id: string): Promise<AnalysisTask> {
    return normalizeTask(await api.post(`/v1/tasks/${encodeURIComponent(id)}/retry`));
  },

  cancel(id: string): Promise<void> {
    return api.delete(`/v1/tasks/${encodeURIComponent(id)}`);
  },

  async setInterpretationCompleted(id: string, completed: boolean, attemptId: string): Promise<AnalysisTaskDetail> {
    const task = normalizeTask(await api.put(`/v1/tasks/${encodeURIComponent(id)}/interpretation-completion`, { completed, attemptId }));
    return { ...task, name: task.name || task.internalId || task.id };
  },

  getStats(): Promise<TaskStatsResponse> {
    return api.get<TaskStatsResponse>('/v1/tasks/stats', { cache: 'no-store' });
  },
};
