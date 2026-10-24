export type TaskStatus =
  | 'waiting_for_data'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'pending_interpretation';

export interface AnalysisTask {
  id: string;
  name?: string;
  sampleId: string;
  internalId: string;
  template?: string;
  pipeline: string;
  pipelineVersion: string;
  status: TaskStatus;
  vmStatus?: string;
  resultImportStatus?: string;
  executionPhase?: string;
  executionReasonCode?: string;
  attemptId?: string;
  progress: number;
  createdAt: string;
  createdBy: string;
  retryStartedAt?: string;
  interpretationCompletedAt?: string;
  interpretationCompletedBy?: string;
  completedAt?: string;
  remark?: string;
}

export interface AnalysisTaskDetail extends AnalysisTask {
  name: string;
}

export interface TaskListResponse {
  items: AnalysisTask[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TaskCreateRequest {
  sampleId: string;
  internalId: string;
  pipelineId: string;
  pipelineName: string;
  pipelineVersion: string;
  remark: string;
}

export interface TaskUpdateRequest {
  internalId: string;
  pipeline: string;
  remark: string;
}

export interface TaskStatsResponse {
  total_tasks: number;
  running_tasks: number;
  failed_last_24h: number;
  status_distribution: Record<string, number>;
  result_import_failed_last_7d: number;
  window_start: string;
}
