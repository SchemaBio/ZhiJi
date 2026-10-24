'use client';

import * as React from 'react';
import { Button } from '@schema/ui-kit';
import { PageContent } from '@/components/layout';
import { deleteDataAsset, listDataAssets, uploadBEDFile, type DataAsset } from '@/lib/data-assets';

export default function BedPage() {
  const [rows, setRows] = React.useState<DataAsset[]>([]);
  const [genome, setGenome] = React.useState<'GRCh37' | 'GRCh38'>('GRCh38');
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [error, setError] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    try {
      const page = await listDataAssets('', { readType: 'bed' });
      setRows(page.items);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法读取 BED 文件');
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (!acknowledged) {
      setError('上传前需要确认你有权使用这个 BED 文件');
      return;
    }
    try {
      await uploadBEDFile(file, genome, true, () => undefined);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    }
  };

  return (
    <PageContent>
      <h2 className="mb-4 text-lg font-medium">BED 文件</h2>
      {error && <p className="mb-3 text-sm text-danger-fg">{error}</p>}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <select value={genome} onChange={(event) => setGenome(event.target.value as 'GRCh37' | 'GRCh38')} className="rounded border border-border bg-canvas px-2 py-1">
          <option value="GRCh38">GRCh38</option>
          <option value="GRCh37">GRCh37</option>
        </select>
        <input ref={fileRef} type="file" accept=".bed,.bed.gz,.gz" />
        <label><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> 我确认有权上传</label>
        <Button variant="primary" onClick={() => void upload()}>上传</Button>
      </div>
      <ul className="divide-y divide-border border border-border rounded-md">
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-fg-muted">没有 BED 文件</li>}
        {rows.map((asset) => (
          <li key={asset.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{asset.file_name} · {asset.reference_genome || '未标注'} · {asset.status}</span>
            <button type="button" className="text-danger-fg" onClick={() => void deleteDataAsset(asset.id).then(load)}>删除</button>
          </li>
        ))}
      </ul>
    </PageContent>
  );
}
