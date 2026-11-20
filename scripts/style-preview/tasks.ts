import type { AnalysisTaskDetail, TaskListResponse, TaskProgressResponse } from '../../src/types/task';
import { normalizeSampleDetail } from '../../src/lib/samples';
import { ApiError, readPreviewSamples } from './api';
import { previewTasks as rows, previewTaskCounts as counts } from './oncology-fixtures';

function findTask(id: string) {
  const task = rows.find(row => row.id === id);
  if (!task) throw new ApiError('找不到合成任务', 404);
  return task;
}

async function rejectTaskWrite(): Promise<never> {
  throw new ApiError('隔离预览仅支持读取合成任务', 405);
}

export const tasksApi = {
  estimate: async () => ({ estimated_minutes: 60 }),
  create: rejectTaskWrite,
  update: rejectTaskWrite,
  start: rejectTaskWrite,
  stop: rejectTaskWrite,
  retry: rejectTaskWrite,
  cancel: rejectTaskWrite,
  retryResultImport: rejectTaskWrite,
  previewBatch: rejectTaskWrite,
  createBatch: rejectTaskWrite,
  setInterpretationCompleted: rejectTaskWrite,
  async list(params: { page?: number | string; page_size?: number | string; status?: string } = {}): Promise<TaskListResponse> {
    const page = Number(params.page) || 1;
    const pageSize = Number(params.page_size) || rows.length;
    const matching = rows.filter(row => !params.status || row.status === params.status);
    const offset = (page - 1) * pageSize;
    return {
      items: matching.slice(offset, offset + pageSize), total: matching.length,
      page, page_size: pageSize, total_pages: Math.ceil(matching.length / pageSize),
    };
  },
  async get(id: string): Promise<AnalysisTaskDetail> { return findTask(id); },
  async getProgress(id: string): Promise<TaskProgressResponse> {
    const task = findTask(id);
    return {
      id, uuid: id, name: task.name, template: task.template, status: task.status,
      progress: task.progress, created_at: task.createdAt, execution_phase: task.executionPhase,
      attempt_id: task.attemptId, result_import_status: task.resultImportStatus,
      result_imported_at: task.completedAt,
    };
  },
  async getLogs(id: string) {
    const task = findTask(id);
    return `${task.createdAt} ${task.internalId} · 合成运行日志 · ${task.status}`;
  },
  async getStats() {
    return {
      total_tasks: rows.length, running_tasks: counts.running ?? 0, failed_last_24h: counts.failed ?? 0,
      status_distribution: counts, result_import_failed_last_7d: 0, window_start: '2026-11-20T00:00:00Z',
    };
  },
  async getSample(id: string) {
    const { sampleId } = findTask(id);
    return normalizeSampleDetail(readPreviewSamples().find(sample => sample.id === sampleId));
  },
};
