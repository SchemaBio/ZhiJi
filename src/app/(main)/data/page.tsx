'use client';

import * as React from 'react';
import { Button, Input } from '@schema/ui-kit';
import { PageContent } from '@/components/layout';
import { deleteDataAsset, listDataAssets, type DataAsset } from '@/lib/data-assets';
import { useUpload } from '@/components/providers/UploadProvider';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败';
}

export default function DataPage() {
  const upload = useUpload();
  const [assets, setAssets] = React.useState<DataAsset[]>([]);
  const [search, setSearch] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [internalId, setInternalId] = React.useState('');
  const read1Ref = React.useRef<HTMLInputElement>(null);
  const read2Ref = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async (query = search) => {
    setLoading(true);
    setError('');
    try {
      const page = await listDataAssets(query);
      setAssets(page.items);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    void listDataAssets('').then((page) => setAssets(page.items)).catch((err: unknown) => setError(errorMessage(err))).finally(() => setLoading(false));
  }, []);

  const handleUpload = async () => {
    const read1 = read1Ref.current?.files?.[0] ?? null;
    const read2 = read2Ref.current?.files?.[0] ?? null;
    if (!acknowledged) {
      setError('上传前需要确认你有权使用这些测序文件');
      return;
    }
    try {
      await upload.uploadReads(read1, read2, true, internalId);
      if (read1Ref.current) read1Ref.current.value = '';
      if (read2Ref.current) read2Ref.current.value = '';
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDataAsset(id);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <PageContent>
      <h2 className="text-lg font-medium text-fg-default mb-4">数据中心</h2>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-fg-muted">
          内部编号
          <Input value={internalId} onChange={(event) => setInternalId(event.target.value)} />
        </label>
        <label className="text-sm text-fg-muted">Read 1<input ref={read1Ref} type="file" /></label>
        <label className="text-sm text-fg-muted">Read 2<input ref={read2Ref} type="file" /></label>
        <label className="flex items-center gap-2 text-sm text-fg-default">
          <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
          我确认有权上传这些文件
        </label>
        <Button variant="primary" onClick={() => void handleUpload()} disabled={upload.busy}>
          {upload.busy ? `上传中 ${upload.progress}%` : '上传'}
        </Button>
      </div>
      <div className="mb-4 flex gap-2">
        <div className="w-64">
          <Input value={search} placeholder="搜索文件" onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Button variant="secondary" onClick={() => void load(search)}>搜索</Button>
      </div>
      {error && <p className="mb-3 text-sm text-danger-fg">{error}</p>}
      {loading && <p className="mb-3 text-sm text-fg-muted">正在读取数据文件…</p>}
      <div className="overflow-x-auto border border-border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-canvas-subtle text-fg-muted">
            <tr>
              <th className="px-3 py-2 text-left">文件</th>
              <th className="px-3 py-2 text-left">类型</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 && !loading && (
              <tr><td colSpan={4} className="px-3 py-6 text-fg-muted">没有测序文件</td></tr>
            )}
            {assets.map((asset) => (
              <tr key={asset.id} className="border-t border-border">
                <td className="px-3 py-2">{asset.file_name || asset.id}</td>
                <td className="px-3 py-2">{asset.read_type}</td>
                <td className="px-3 py-2">{asset.status}</td>
                <td className="px-3 py-2">
                  <button type="button" className="text-danger-fg" onClick={() => void handleDelete(asset.id)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContent>
  );
}
