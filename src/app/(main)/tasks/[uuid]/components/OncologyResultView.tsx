'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { WorkspaceInspector } from '@/components/shared/WorkspaceInspector';
import { useBusinessPermissions } from '@/components/providers/BusinessPermissionProvider';
import { useText } from '@/i18n/useText';
import { focusVariant, getOncologyResultTable, pinVariant } from '../result-api';
import { oncologyResultModules, oncologyReviewTables, type OncologyResultRow, type OncologyResultSummary, type OncologyResultTab, type OncologyValue, type OncologyTab, type SNVResultLocus } from '../oncology-results';
import type { ResultContext, TabConfig } from '../types';
import { FocusCheckbox, FocusColumnHeader, PinCheckbox, PinColumnHeader } from './ReviewCheckboxes';
import { CopyTableButton } from './CopyTableButton';

type Props = {
  taskId: string;
  tab: OncologyResultTab;
  summary?: OncologyResultSummary;
  activeRow: string | null;
  tabs: TabConfig[];
  permissions?: ResultContext['permissions'];
  onNavigate: (tab: OncologyTab, rowId?: string, locus?: SNVResultLocus) => void;
};

function valueTone(value: OncologyValue | undefined) {
  switch (value) {
    case 'oncologyResults.ready':
    case 'oncologyResults.detected':
    case 'oncologyResults.pass':
      return 'bg-success-subtle text-success-fg';
    case 'oncologyResults.lowCoverage':
    case 'oncologyResults.indeterminate':
    case 'oncologyResults.pending':
      return 'bg-warning-subtle text-warning-fg';
    default:
      return 'bg-canvas-subtle text-fg-muted';
  }
}

export function OncologyResultView({ taskId, tab, summary, activeRow, tabs, permissions, onNavigate }: Props) {
  const t = useText();
  const { hasPermission } = useBusinessPermissions();
  const showReviewMarks = oncologyReviewTables.has(tab);
  const canManage = hasPermission('interpretation_reports.manage');
  const pendingRows = useRef(new Set<string>());
  const [savingRows, setSavingRows] = useState<Set<string>>(() => new Set());
  const [markError, setMarkError] = useState<string | null>(null);
  const config = oncologyResultModules[tab];
  const state = summary?.state ?? 'unavailable';
  const [result, setResult] = useState<OncologyResultRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<{ key: string; value: string } | null>(null);
  const [sort, setSort] = useState<{ key: string; direction: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (state !== 'ready') return;
    const controller = new AbortController();
    setFailed(false);
    getOncologyResultTable(taskId, tab, controller.signal).then(table => {
      if (!controller.signal.aborted) setResult(table.rows);
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [state, taskId, tab, retry]);

  const label = (key: string) => t('oncologyResults.' + key);
  const display = (value: OncologyValue | undefined) => {
    if (value == null || value === '') return '—';
    if (typeof value === 'number') return value.toLocaleString(t.locale, { maximumFractionDigits: 6 });
    return value.startsWith('oncologyResults.') ? t(value) : value;
  };
  const columns: readonly string[] = config.columns;
  const pageSize = 50;
  const rows = result ?? [];
  const matches = rows.filter(row => (!filter || String(row.values[filter.key] ?? row.details?.[filter.key]) === filter.value) &&
    (!query.trim() || Object.values(row.values).some(value => display(value).toLocaleLowerCase(t.locale).includes(query.trim().toLocaleLowerCase(t.locale)))));
  const priority = (row: OncologyResultRow) => row.focused ? 0 : row.pinned ? 1 : 2;
  if (showReviewMarks || sort) matches.sort((left, right) => {
    const markedOrder = showReviewMarks ? priority(left) - priority(right) : 0;
    if (markedOrder !== 0 || !sort) return markedOrder;
    const a = left.values[sort.key], b = right.values[sort.key];
    if (a == null) return b == null ? 0 : 1;
    if (b == null) return -1;
    const order = typeof a === 'number' && typeof b === 'number' ? a - b : display(a).localeCompare(display(b), t.locale, { numeric: true });
    return sort.direction * order;
  });
  const lastPage = Math.max(0, Math.ceil(matches.length / pageSize) - 1);
  const current = Math.min(page, lastPage);
  const selected = rows.find(row => row.id === (selection === undefined ? activeRow : selection));
  const title = label(config.label);
  const linked = (row: OncologyResultRow) => row.related?.filter(link => tabs.some(item => item.id === link.tab)) ?? [];
  const openRelated = (link: NonNullable<OncologyResultRow['related']>[number]) => onNavigate(link.tab, link.id, link.tab === 'snv-indel' ? link.locus : undefined);
  const resetPage = () => setPage(0);
  const close = () => {
    if (activeRow) onNavigate(tab);
    else setSelection(null);
  };

  async function setMark(rowId: string, mark: 'focused' | 'pinned', value: boolean) {
    if (pendingRows.current.has(rowId)) return;
    pendingRows.current.add(rowId);
    setSavingRows(new Set(pendingRows.current));
    setMarkError(null);
    try {
      const save = mark === 'focused' ? focusVariant : pinVariant;
      await save(taskId, tab, rowId, value);
      setResult(current => current?.map(row => row.id === rowId ? { ...row, [mark]: value } : row) ?? null);
    } catch {
      setMarkError(t(mark === 'focused' ? 'tasks.unableToSaveFocusSelection594b1f' : 'tasks.unableToSavePinStatus87ecc6'));
    } finally {
      pendingRows.current.delete(rowId);
      setSavingRows(new Set(pendingRows.current));
    }
  }

  return (
    <section aria-label={title} className="flex h-full min-h-0 flex-col gap-3 pt-3">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-fg-default">{title}</h2>
          {tab === 'neoantigen' && <p className="text-xs text-fg-muted">{label('prediction')}</p>}
        </div>
        {state === 'ready' && matches.length > 0 && <CopyTableButton rows={[
          columns.map(label),
          ...matches.map(row => columns.map(key => display(row.values[key]))),
        ]} />}
      </header>

      {markError && <p role="alert" className="text-sm text-danger-fg">{markError}</p>}
      {state !== 'ready' ? <p role="status" className="rounded-lg border border-border-default bg-canvas-default p-6 text-sm text-fg-muted">{label(state)}</p>
        : failed ? <div role="alert" className="rounded-lg border border-border-default bg-canvas-default p-6 text-sm text-fg-muted">
          <p>{label('loadError')}</p>
          <button type="button" className="mt-2 text-accent-fg hover:underline" onClick={() => { setFailed(false); setRetry(value => value + 1); }}>{label('retry')}</button>
        </div>
          : !result ? <p role="status" className="p-6 text-sm text-fg-muted">{label('loading')}</p>
            : <>
              {tab === 'biomarkers' && rows.length > 0 && <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
                {rows.filter(row => ['MSI', 'DLBCL', 'HRD', 'TMB'].includes(row.id)).map(row =>
                  <button key={row.id} type="button" onClick={() => setSelection(row.id)} className="rounded-lg border border-border-default bg-canvas-default px-3 py-2 text-left hover:bg-canvas-subtle">
                    <span className="block text-xs text-fg-muted">{display(row.values.metric)}</span>
                    <span className="font-semibold text-fg-default">{display(row.values.result === null ? row.values.status : row.values.result)}</span>
                  </button>)}
              </div>}
              <div className={'relative flex min-h-0 flex-1 gap-3 ' + (selected ? 'yj-has-inspector' : '')}>
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-default bg-canvas-default">
                  <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-default px-3 py-2">
                    <input aria-label={label('search')} placeholder={label('search')} type="search" value={query}
                      onChange={event => { setQuery(event.target.value); resetPage(); }}
                      className="min-w-0 rounded-md border border-border-default bg-canvas-default px-2.5 py-1.5 text-sm" />
                    {config.filters.map(key => {
                      const options = [...new Map(rows.flatMap(row => {
                        const value = row.values[key] ?? row.details?.[key];
                        return value == null ? [] : [[String(value), display(value)] as const];
                      })).entries()];
                      if (options.length === 0) return null;
                      return <select key={key} aria-label={label(key)} value={filter?.key === key ? filter.value : ''}
                        onChange={event => { setFilter(event.target.value ? { key, value: event.target.value } : null); resetPage(); }}
                        className="rounded-md border border-border-default bg-canvas-default px-2 py-1.5 text-sm">
                        <option value="">{label(key)}</option>
                        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                      </select>;
                    })}
                    <span className="ml-auto text-xs tabular-nums text-fg-muted">{label('count')} {matches.length.toLocaleString(t.locale)}</span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="sticky top-0 bg-canvas-subtle text-xs text-fg-muted">
                        <tr>{showReviewMarks && <>
                          <th scope="col" className="w-14 whitespace-nowrap px-2 py-2 text-center font-medium"><FocusColumnHeader /></th>
                          <th scope="col" className="w-14 whitespace-nowrap px-2 py-2 text-center font-medium"><PinColumnHeader /></th>
                        </>}{columns.map(key => <th scope="col" key={key} className="whitespace-nowrap px-3 py-2 font-medium"
                          aria-sort={sort?.key === key ? (sort.direction === 1 ? 'ascending' : 'descending') : undefined}>
                          <button type="button" onClick={() => { setSort({ key, direction: sort?.key === key && sort.direction === 1 ? -1 : 1 }); resetPage(); }}>
                            {label(key)} {sort?.key === key && (sort.direction === 1 ? '↑' : '↓')}
                          </button>
                        </th>)}</tr>
                      </thead>
                      <tbody>{matches.slice(current * pageSize, (current + 1) * pageSize).map(row => (
                        <tr key={row.id} className={'border-t border-border-default ' + (selected?.id === row.id ? 'bg-accent-subtle' : 'hover:bg-canvas-subtle')}>
                          {showReviewMarks && <>
                            <td className="px-2 py-1 text-center">
                              <FocusCheckbox checked={row.focused === true} disabled={!canManage || !permissions?.canFocus || savingRows.has(row.id)}
                                onChange={value => void setMark(row.id, 'focused', value)} />
                            </td>
                            <td className="px-2 py-1 text-center">
                              <PinCheckbox checked={row.pinned === true} disabled={!canManage || !permissions?.canReview || savingRows.has(row.id)}
                                onChange={value => void setMark(row.id, 'pinned', value)} />
                            </td>
                          </>}
                          {columns.map((key, index) => {
                            const value = row.values[key];
                            const text = display(value);
                            if (index === 0) return <th scope="row" key={key} className="px-3 py-2 font-medium">
                              <button type="button" onClick={() => setSelection(row.id)} className="inline-flex items-center gap-1 whitespace-nowrap text-left text-accent-fg hover:underline">
                                {text}<ChevronRight size={13} aria-hidden="true" />
                              </button>
                            </th>;
                            const links = key === 'related' ? linked(row) : [];
                            return <td key={key} className="whitespace-nowrap px-3 py-2 tabular-nums">
                              {links.length ? <button type="button" className="text-accent-fg hover:underline" onClick={() => openRelated(links[0])}>{display(links[0].label)}</button>
                                : ['status', 'review', 'qc'].includes(key) && value ? <span className={'rounded px-1.5 py-0.5 text-xs ' + valueTone(value)}>{text}</span> : text}
                            </td>;
                          })}
                        </tr>
                      ))}</tbody>
                    </table>
                    {matches.length === 0 && <p role="status" className="p-6 text-center text-sm text-fg-muted">{label(rows.length ? 'noMatches' : 'noRows')}</p>}
                  </div>
                  {lastPage > 0 && <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border-default px-3 py-2 text-xs">
                    <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="disabled:opacity-40">{label('previous')}</button>
                    <span className="tabular-nums">{current + 1} / {lastPage + 1}</span>
                    <button type="button" disabled={current === lastPage} onClick={() => setPage(current + 1)} className="disabled:opacity-40">{label('next')}</button>
                  </div>}
                </div>
                {selected && <WorkspaceInspector label={label('details')} onClose={close}>
                  <div className="flex items-start justify-between gap-2 border-b border-border-default px-4 py-3">
                    <div><p className="text-xs text-fg-muted">{title}</p><h3 className="font-semibold">{display(selected.values[columns[0]])}</h3></div>
                    <button type="button" aria-label={label('close')} className="rounded p-1 hover:bg-canvas-subtle" onClick={close}><X size={17} /></button>
                  </div>
                  {tab === 'cnv-chrom' && typeof selected.values.fraction === 'number' && <div className="shrink-0 border-b border-border-default px-4 py-3">
                    <p className="mb-1 text-xs text-fg-muted">{label('fraction')} · {display(selected.values.fraction)}%</p>
                    <meter className="block w-full" aria-label={label('fraction')} min={0} max={100} value={selected.values.fraction} />
                  </div>}
                  {tab === 'fusion' && selected.values.exons && <div className="shrink-0 border-b border-border-default px-4 py-3 text-sm">
                    <p>{display(selected.values.partners)}</p>
                    <p className="text-xs text-fg-muted">{display(selected.values.exons)}</p>
                  </div>}
                  <dl className="grid min-h-0 flex-1 content-start gap-3 overflow-auto px-4 py-3 text-sm">
                    {Object.entries({ ...Object.fromEntries(columns.map(key => [key, selected.values[key]])), ...selected.details })
                      .filter(([key]) => key !== 'related').map(([key, value]) => <div key={key}>
                        <dt className="text-xs text-fg-muted">{key.startsWith('detail.') ? key.slice(7) : label(key)}</dt>
                        <dd className="break-words text-fg-default">{display(value)}</dd>
                      </div>)}
                  </dl>
                  {linked(selected).length > 0 && <ul className="space-y-2 border-t border-border-default px-4 py-3 text-sm">
                    {linked(selected).map(link => <li key={link.tab + ':' + link.id}><button type="button" className="text-accent-fg hover:underline" onClick={() => openRelated(link)}>{display(link.label)} →</button></li>)}
                  </ul>}
                </WorkspaceInspector>}
              </div>
            </>}
    </section>
  );
}
