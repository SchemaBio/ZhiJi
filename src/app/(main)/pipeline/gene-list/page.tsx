'use client';

import * as React from 'react';
import { Button, Input } from '@schema/ui-kit';
import { PageContent } from '@/components/layout';
import { createGeneList, deleteGeneList, listGeneLists, type GeneList } from '@/lib/gene-lists';

export default function GeneListPage() {
  const [rows, setRows] = React.useState<GeneList[]>([]);
  const [name, setName] = React.useState('');
  const [genes, setGenes] = React.useState('');
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      setRows(await listGeneLists());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法读取基因列表');
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const create = async () => {
    try {
      await createGeneList({
        name,
        description: '',
        genes: genes.split(/[\s,]+/).map((gene) => gene.trim()).filter(Boolean),
      });
      setName('');
      setGenes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  return (
    <PageContent>
      <h2 className="mb-4 text-lg font-medium">基因列表</h2>
      {error && <p className="mb-3 text-sm text-danger-fg">{error}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="名称" value={name} onChange={(event) => setName(event.target.value)} />
        <Input placeholder="基因，用逗号或空格分隔" value={genes} onChange={(event) => setGenes(event.target.value)} />
        <Button variant="primary" onClick={() => void create()}>新建</Button>
      </div>
      <ul className="divide-y divide-border border border-border rounded-md">
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-fg-muted">没有基因列表</li>}
        {rows.map((list) => (
          <li key={list.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{list.name} · {list.genes.length} 个基因</span>
            <button type="button" className="text-danger-fg" onClick={() => void deleteGeneList(list.id).then(load)}>删除</button>
          </li>
        ))}
      </ul>
    </PageContent>
  );
}
