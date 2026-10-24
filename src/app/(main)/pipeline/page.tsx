'use client';

import * as React from 'react';
import { Input } from '@schema/ui-kit';
import { PageContent } from '@/components/layout';
import { listPipelines, type Pipeline } from '@/lib/pipelines';

export default function PipelinePage() {
  const [rows, setRows] = React.useState<Pipeline[]>([]);
  const [search, setSearch] = React.useState('');
  const [error, setError] = React.useState('');

  const load = React.useCallback(async (query = '') => {
    try {
      setRows(await listPipelines(query));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法读取流程');
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  return (
    <PageContent>
      <h2 className="mb-4 text-lg font-medium text-fg-default">流程列表</h2>
      <div className="mb-4 flex gap-2">
        <div className="w-64"><Input value={search} placeholder="搜索流程" onChange={(event) => setSearch(event.target.value)} /></div>
        <button type="button" className="text-sm text-accent-fg" onClick={() => void load(search)}>搜索</button>
      </div>
      {error && <p className="mb-3 text-sm text-danger-fg">{error}</p>}
      <ul className="divide-y divide-border border border-border rounded-md">
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-fg-muted">没有流程</li>}
        {rows.map((pipeline) => (
          <li key={pipeline.id} className="px-4 py-3">
            <p className="text-sm font-medium text-fg-default">{pipeline.name} <span className="font-normal text-fg-muted">{pipeline.version}</span></p>
            <p className="text-xs text-fg-muted">{pipeline.baseType || '未标注类型'} · {pipeline.referenceGenome || '参考基因组未填写'} · {pipeline.status === 'active' ? '启用' : '停用'}</p>
            {pipeline.description && <p className="mt-1 text-sm text-fg-muted">{pipeline.description}</p>}
          </li>
        ))}
      </ul>
    </PageContent>
  );
}
