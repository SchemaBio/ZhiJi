'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageContent } from '@/components/layout';
import { tasksApi } from '@/lib/tasks';
import { listSamples } from '@/lib/samples';
import { taskDisplayStatus, taskStatusConfig } from '@/lib/task-presentation';
import type { AnalysisTask, TaskStatsResponse } from '@/types/task';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '无法读取 Loligo';
}

export default function DashboardPage() {
  const [stats, setStats] = React.useState<TaskStatsResponse | null>(null);
  const [sampleCount, setSampleCount] = React.useState<number | null>(null);
  const [recent, setRecent] = React.useState<AnalysisTask[]>([]);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([tasksApi.getStats(), tasksApi.list({ page: 1, page_size: 8 }), listSamples()])
      .then(([nextStats, taskPage, samples]) => {
        if (cancelled) return;
        setStats(nextStats);
        setRecent(taskPage.items);
        setSampleCount(samples.length);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const distribution = stats?.status_distribution ?? {};

  return (
    <PageContent>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-medium text-fg-default">概览</h2>
        <div className="flex gap-3 text-sm">
          <Link href="/samples" className="text-accent-fg hover:underline">样本管理</Link>
          <Link href="/tasks" className="text-accent-fg hover:underline">任务中心</Link>
        </div>
      </div>
      {error && <p className="mb-4 text-sm text-danger-fg">{error}</p>}
      {loading && <p className="mb-4 text-sm text-fg-muted">正在读取 Loligo…</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <Stat title="样本总数" value={sampleCount} />
        <Stat title="任务总数" value={stats?.total_tasks} />
        <Stat title="运行中" value={stats?.running_tasks} />
        <Stat title="近 24 小时失败" value={stats?.failed_last_24h} />
        <Stat title="排队" value={distribution.queued} />
        <Stat title="待解读" value={distribution.pending_interpretation} />
        <Stat title="分析完成" value={distribution.completed} />
        <Stat title="失败" value={distribution.failed} />
      </div>
      <h3 className="text-sm font-medium text-fg-default mb-3">最近任务</h3>
      <ul className="divide-y divide-border border border-border rounded-md">
        {recent.length === 0 && !loading && <li className="px-4 py-6 text-sm text-fg-muted">还没有任务</li>}
        {recent.map((task) => {
          const status = taskStatusConfig[taskDisplayStatus(task)];
          return (
            <li key={task.id}>
              <Link href={`/tasks/${task.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-canvas-subtle">
                <span className="text-sm text-fg-default">{task.name || task.internalId || task.id.slice(0, 8)}</span>
                <span className="text-xs text-fg-muted">{status.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageContent>
  );
}

function Stat({ title, value }: { title: string; value?: number | null }) {
  return (
    <div className="rounded-md border border-border bg-canvas-subtle px-4 py-3">
      <p className="text-xs text-fg-muted">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-fg-default">{value ?? '—'}</p>
    </div>
  );
}
