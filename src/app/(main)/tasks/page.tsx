'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Input, Select } from '@schema/ui-kit';
import { PageContent } from '@/components/layout';
import { tasksApi } from '@/lib/tasks';
import { listSamples } from '@/lib/samples';
import { listPipelines, type Pipeline } from '@/lib/pipelines';
import { taskDisplayCreatedAt, taskDisplayStatus, taskStatusConfig } from '@/lib/task-presentation';
import type { AnalysisTask } from '@/types/task';
import type { Sample } from '@/app/(main)/samples/types';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'queued', label: '排队中' },
  { value: 'running', label: '运行中' },
  { value: 'pending_interpretation', label: '待解读' },
  { value: 'completed', label: '分析完成' },
  { value: 'failed', label: '失败' },
];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败';
}

export default function TasksPage() {
  return (
    <React.Suspense fallback={<PageContent><p className="text-sm text-fg-muted">正在读取任务…</p></PageContent>}>
      <TasksPageContent />
    </React.Suspense>
  );
}

function TasksPageContent() {
  const params = useSearchParams();
  const initialStatus = params.get('status') || 'all';
  const [status, setStatus] = React.useState(initialStatus);
  const [search, setSearch] = React.useState('');
  const [tasks, setTasks] = React.useState<AnalysisTask[]>([]);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<AnalysisTask | null>(null);

  const load = React.useCallback(async () => {
    try {
      const page = await tasksApi.list({ status, search, page: 1, page_size: 50 });
      setTasks(page.items);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  React.useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); }, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const act = async (work: () => Promise<unknown>) => {
    try {
      await work();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <PageContent>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-fg-default">任务中心</h2>
        <Button variant="primary" onClick={() => setCreating(true)}>新建任务</Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="w-64">
          <Input value={search} placeholder="搜索任务或样本" onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="w-40">
          <Select value={status} options={STATUS_OPTIONS} onChange={(value) => setStatus(Array.isArray(value) ? value[0] : value)} />
        </div>
      </div>
      {error && <p className="mb-3 text-sm text-danger-fg">{error}</p>}
      {loading && <p className="mb-3 text-sm text-fg-muted">正在读取任务…</p>}
      <div className="overflow-x-auto border border-border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-canvas-subtle text-left text-fg-muted">
            <tr>
              <th className="px-3 py-2">任务</th>
              <th className="px-3 py-2">样本</th>
              <th className="px-3 py-2">流程</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">进度</th>
              <th className="px-3 py-2">创建</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && !loading && <tr><td colSpan={7} className="px-3 py-6 text-fg-muted">没有任务</td></tr>}
            {tasks.map((task) => {
              const display = taskStatusConfig[taskDisplayStatus(task)];
              return (
                <tr key={task.id} className="border-t border-border">
                  <td className="px-3 py-2"><Link className="text-accent-fg hover:underline" href={`/tasks/${task.id}`}>{task.name || task.id.slice(0, 8)}</Link></td>
                  <td className="px-3 py-2">{task.internalId || task.sampleId}</td>
                  <td className="px-3 py-2">{task.pipeline} {task.pipelineVersion}</td>
                  <td className="px-3 py-2">{display.label}{task.executionPhase ? ` · ${task.executionPhase}` : ''}</td>
                  <td className="px-3 py-2">{task.progress}%</td>
                  <td className="px-3 py-2">{taskDisplayCreatedAt(task)}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button type="button" className="text-accent-fg" onClick={() => setEditing(task)}>编辑</button>
                    {task.status === 'failed' && <button type="button" className="text-accent-fg" onClick={() => void act(() => tasksApi.retry(task.id))}>重试</button>}
                    {task.status === 'queued' && <button type="button" className="text-accent-fg" onClick={() => void act(() => tasksApi.start(task.id))}>启动</button>}
                    {(task.status === 'queued' || task.status === 'running') && <button type="button" className="text-danger-fg" onClick={() => void act(() => tasksApi.cancel(task.id))}>取消</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {creating && <CreateTaskModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); void load(); }} />}
      {editing && (
        <EditTaskModal
          task={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
    </PageContent>
  );
}

function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [samples, setSamples] = React.useState<Sample[]>([]);
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [sampleId, setSampleId] = React.useState('');
  const [pipelineId, setPipelineId] = React.useState('');
  const [remark, setRemark] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    Promise.all([listSamples(), listPipelines()]).then(([nextSamples, nextPipelines]) => {
      setSamples(nextSamples);
      setPipelines(nextPipelines);
      setSampleId(nextSamples[0]?.id ?? '');
      setPipelineId(nextPipelines[0]?.id ?? '');
    }).catch((err: unknown) => setError(errorMessage(err)));
  }, []);

  const submit = async () => {
    const sample = samples.find((item) => item.id === sampleId);
    const pipeline = pipelines.find((item) => item.id === pipelineId);
    if (!sample || !pipeline) {
      setError('请选择样本和流程');
      return;
    }
    try {
      await tasksApi.create({
        sampleId: sample.id,
        internalId: sample.internalId,
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
        pipelineVersion: pipeline.version,
        remark,
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal title="新建任务" onClose={onClose}>
      {error && <p className="mb-2 text-sm text-danger-fg">{error}</p>}
      <label className="mb-3 block text-sm">样本
        <Select value={sampleId} options={samples.map((sample) => ({ value: sample.id, label: sample.internalId || sample.id }))} onChange={(value) => setSampleId(Array.isArray(value) ? value[0] : value)} />
      </label>
      <label className="mb-3 block text-sm">流程
        <Select value={pipelineId} options={pipelines.map((pipeline) => ({ value: pipeline.id, label: `${pipeline.name} ${pipeline.version}` }))} onChange={(value) => setPipelineId(Array.isArray(value) ? value[0] : value)} />
      </label>
      <label className="mb-3 block text-sm">备注
        <Input value={remark} onChange={(event) => setRemark(event.target.value)} />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={() => void submit()}>创建</Button>
      </div>
    </Modal>
  );
}

function EditTaskModal({ task, onClose, onSaved }: { task: AnalysisTask; onClose: () => void; onSaved: () => void }) {
  const [internalId, setInternalId] = React.useState(task.internalId);
  const [remark, setRemark] = React.useState(task.remark ?? '');
  const [error, setError] = React.useState('');

  const submit = async () => {
    try {
      await tasksApi.update(task.id, { internalId, pipeline: task.pipeline, remark });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal title="编辑任务" onClose={onClose}>
      {error && <p className="mb-2 text-sm text-danger-fg">{error}</p>}
      <label className="mb-3 block text-sm">内部编号
        <Input value={internalId} onChange={(event) => setInternalId(event.target.value)} />
      </label>
      <label className="mb-3 block text-sm">备注
        <Input value={remark} onChange={(event) => setRemark(event.target.value)} />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={() => void submit()}>保存</Button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-md bg-canvas p-4 shadow-lg" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-medium">{title}</h3>
          <button type="button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
