'use client';

import * as React from 'react';
import { uploadDataFiles, type UploadBatchResult } from '@/lib/data-assets';

interface UploadContextValue {
  busy: boolean;
  progress: number;
  error: string | null;
  uploadReads: (read1: File | null, read2: File | null, acknowledged: boolean, internalId: string) => Promise<UploadBatchResult>;
}

const UploadContext = React.createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const uploadReads = React.useCallback(async (read1: File | null, read2: File | null, acknowledged: boolean, internalId: string) => {
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      return await uploadDataFiles(read1, read2, acknowledged, internalId, setProgress);
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败';
      setError(message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = React.useMemo(() => ({ busy, progress, error, uploadReads }), [busy, progress, error, uploadReads]);
  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUpload(): UploadContextValue {
  const value = React.useContext(UploadContext);
  if (!value) throw new Error('useUpload must be used within UploadProvider');
  return value;
}
