'use client';

import * as React from 'react';
import { PageContent } from '@/components/layout';
import { deleteCNVBaseline, listCNVBaselines, type CNVBaseline } from '@/lib/cnv-baselines';

export default function BaselinePage() {
  const [rows, setRows] = React.useState<CNVBaseline[]>([]);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      setRows(await listCNVBaselines());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法读取基线');
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  return (
    <PageContent>
      <h2 className="mb-4 text-lg font-medium">基线管理</h2>
      {error && <p className="mb-3 text-sm text-danger-fg">{error}</p>}
      <ul className="divide-y divide-border border border-border rounded-md">
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-fg-muted">没有 CNV 基线</li>}
        {rows.map((baseline) => (
          <li key={baseline.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{baseline.name} · {baseline.reference_genome} · {baseline.status} · {baseline.progress}%</span>
            <button type="button" className="text-danger-fg" onClick={() => void deleteCNVBaseline(baseline.id).then(load)}>删除</button>
          </li>
        ))}
      </ul>
    </PageContent>
  );
}
