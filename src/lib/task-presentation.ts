import { isTaskResultImportFailed, isTaskResultPreparing } from './task-interpretation';
import type { AnalysisTask, TaskStatus } from '@/types/task';

export type TaskDisplayStatus = TaskStatus | 'interpretation_completed' | 'preparing_results' | 'import_failed';

export const taskStatusConfig: Record<TaskDisplayStatus, { label: string; variant: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }> = {
  preparing_results: { label: '结果准备中', variant: 'neutral' },
  import_failed: { label: '结果导入失败', variant: 'danger' },
  waiting_for_data: { label: '等待数据', variant: 'warning' },
  queued: { label: '排队中', variant: 'neutral' },
  running: { label: '运行中', variant: 'info' },
  completed: { label: '分析完成', variant: 'info' },
  interpretation_completed: { label: '解读完成', variant: 'success' },
  failed: { label: '失败', variant: 'danger' },
  cancelled: { label: '已取消', variant: 'neutral' },
  pending_interpretation: { label: '待解读', variant: 'warning' },
};

export function taskDisplayStatus(task: { status: TaskStatus; interpretationCompletedAt?: string; resultImportStatus?: string; template?: string }): TaskDisplayStatus {
  if (isTaskResultImportFailed(task)) return 'import_failed';
  if (isTaskResultPreparing(task)) return 'preparing_results';
  return task.interpretationCompletedAt ? 'interpretation_completed' : task.status;
}

export function taskStatusClass(status: TaskDisplayStatus): string {
  return `zj-task-status-${status}`;
}

export function taskDisplayCreatedAt(task: { createdAt: string; retryStartedAt?: string }): string {
  return task.retryStartedAt || task.createdAt;
}
