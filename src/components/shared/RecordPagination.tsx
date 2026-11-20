'use client';

import { useEffect, useState } from 'react';
import { useText } from '@/i18n/useText';
import { ActionButton } from './ActionButton';

const RECORDS_PER_PAGE = 15;

export function useRecordPagination<T>(records: T[]) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(records.length / RECORDS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * RECORDS_PER_PAGE;

  useEffect(() => {
    setPage(previous => Math.min(previous, totalPages));
  }, [totalPages]);

  return {
    visibleRecords: records.slice(start, start + RECORDS_PER_PAGE),
    pagination: { currentPage, totalPages, totalRecords: records.length, onPageChange: setPage },
  };
}

export function RecordPagination({ currentPage, totalPages, totalRecords, onPageChange }: {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
}) {
  const t = useText();
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default px-5 py-3">
      <span aria-live="polite" className="text-xs text-fg-muted">
        {t('resourcePicker.pageSummary', {
          p0: currentPage.toLocaleString(t.locale),
          p1: totalPages.toLocaleString(t.locale),
          p2: totalRecords.toLocaleString(t.locale),
        })}
      </span>
      <div className="flex gap-2">
        <ActionButton permission={null} action="previous" size="small" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>{t('resourcePicker.previous')}</ActionButton>
        <ActionButton permission={null} action="next" size="small" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>{t('resourcePicker.next')}</ActionButton>
      </div>
    </div>
  );
}
