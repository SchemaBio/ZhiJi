'use client';

import { useEffect, useState } from 'react';
import { DataTable, Input, type Column } from '@schema/ui-kit';
import { Search } from 'lucide-react';
import { ActionButton } from '@/components/shared/ActionButton';
import { TableViewControls, useTableView } from '@/components/shared/TableViewControls';
import { Tag } from '@/components/shared/Tag';
import { useText } from '@/i18n/useText';
import { chemotherapyGuidelines } from '@/lib/chemotherapy-guidelines';
import { clinpgxArchive } from '@/lib/chemotherapy-clinpgx';
import { getOncologyResultTable } from '../result-api';
import { mergeChemotherapyRows, type ChemotherapyRow } from '../chemotherapy-results';
import { oncologyColumnValue, type OncologyResultRow, type OncologyResultSummary, type OncologyValue } from '../oncology-results';
import { CopyTableButton } from './CopyTableButton';
import { OncologyResultInspector } from './OncologyResultInspector';

const optional = ['hgvs', 'markerType', 'activityScore', 'sampleSource', 'qc'];

export function ChemotherapyResultView({ taskId, summary, referenceGenome, activeRow, clearActiveRow }: {
  taskId: string;
  summary?: OncologyResultSummary;
  referenceGenome?: string;
  activeRow: string | null;
  clearActiveRow: () => void;
}) {
  const t = useText();
  const state = summary?.state ?? 'unavailable';
  const [data, setData] = useState<OncologyResultRow[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [gene, setGene] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' }>();
  const [selectedId, setSelectedId] = useState<string | null>(activeRow);
  const view = useTableView(optional);

  useEffect(() => {
    setData(null);
    setError(false);
    if (state !== 'ready') return;
    const controller = new AbortController();
    getOncologyResultTable(taskId, 'chemotherapy', controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result.rows);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [state, taskId, retry]);

  const catalog = (key: string) => t('chemotherapyCatalog.' + key);
  const oncology = (key: string) => t('oncologyResults.' + key);
  const display = (input: OncologyValue | undefined) => {
    if (input == null || input === '') return '—';
    if (typeof input === 'number') return input.toLocaleString(t.locale, { maximumFractionDigits: 6 });
    return input.startsWith('oncologyResults.') || input.startsWith('chemotherapyCatalog.') ? t(input) : input;
  };
  const value = (row: ChemotherapyRow, id: string): OncologyValue | undefined => {
    if (id === 'drug' && row.marker) {
      return chemotherapyGuidelines[row.marker.guideline].drugs.map(catalog).join(' / ');
    }
    return oncologyColumnValue(row, id);
  };
  const makeColumn = (id: string, header: string, width: number): Column<ChemotherapyRow> => ({
    id, header, width, sortable: true, align: 'center', accessor: row => display(value(row, id)),
  });
  const columns = [
    makeColumn('gene', oncology('gene'), 92), makeColumn('marker', catalog('marker'), 125),
    makeColumn('locus', 'rsID', 120), makeColumn('status', oncology('status'), 118),
    makeColumn('genotype', oncology('genotype'), 130), makeColumn('phenotype', oncology('phenotype'), 135),
    makeColumn('efficacy', catalog('efficacy'), 140), makeColumn('toxicityRisk', catalog('toxicityRisk'), 142),
    makeColumn('drug', oncology('drug'), 145), makeColumn('guideline', catalog('guideline'), 155),
    makeColumn('hgvs', oncology('hgvs'), 180), makeColumn('markerType', catalog('markerType'), 118),
    makeColumn('activityScore', oncology('activityScore'), 108), makeColumn('sampleSource', oncology('sampleSource'), 125),
    makeColumn('qc', oncology('qc'), 100),
  ].map(column => column.id === 'toxicityRisk' ? {
    ...column,
    accessor: (row: ChemotherapyRow) => {
      const risk = value(row, 'toxicityRisk');
      return <Tag variant={risk === 'chemotherapyCatalog.elevatedRisk' ? 'warning' : 'neutral'}>{display(risk)}</Tag>;
    },
  } : column);

  const rows = mergeChemotherapyRows(data ?? [], state);
  const geneOptions = [...new Set(rows.map(row => display(value(row, 'gene'))))];
  const statuses = [...new Set(rows.map(row => String(value(row, 'status'))))];
  const term = query.toLocaleLowerCase(t.locale).trim();
  const matches = rows.filter(row =>
    (!gene || value(row, 'gene') === gene) && (!status || value(row, 'status') === status) &&
    (!term || columns.some(column => display(value(row, column.id)).toLocaleLowerCase(t.locale).includes(term))
      || [row.marker?.gene + (row.marker?.name ?? ''), ...row.sources.map(source => source.label)]
        .some(item => item.toLocaleLowerCase(t.locale).includes(term))));
  if (sort) matches.sort((left, right) => {
    const a = value(left, sort.column), b = value(right, sort.column);
    if (a == null || b == null) return a == null ? Number(b != null) : -1;
    const comparison = typeof a === 'number' && typeof b === 'number'
      ? a - b : display(a).localeCompare(display(b), t.locale, { numeric: true });
    return sort.direction === 'asc' ? comparison : -comparison;
  });
  const selected = rows.find(row => row.id === selectedId);
  const visible = view.apply(columns);
  const copied = visible.filter(column => column.visible);

  return <section aria-label={oncology('chemotherapy')} data-density={view.density}
    className={'variant-tab-panel yj-interpretation-panel flex h-full min-h-0 flex-col overflow-hidden ' + (selected ? 'yj-has-inspector' : '')}>
    <div className="yj-variant-toolbar">
      <div className="yj-filter-tools flex flex-wrap items-center gap-2">
        <TableViewControls columns={columns} view={view} />
        {matches.length > 0 && <CopyTableButton rows={[
          copied.map(column => String(column.header)),
          ...matches.map(row => copied.map(column => display(value(row, column.id)))),
        ]} />}
      </div>
      <div className="yj-variant-controls-row">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-52 shrink-0"><Input aria-label={catalog('search')} placeholder={catalog('search')}
            className="yj-variant-search [&_input]:min-w-0 [&_input]:w-0" value={query} onChange={event => setQuery(event.target.value)}
            leftElement={<Search className="h-4 w-4" />} /></div>
          <select aria-label={oncology('gene')} value={gene} onChange={event => setGene(event.target.value)}
            className="rounded-md border border-border-default bg-canvas-default px-3 py-1.5 text-sm">
            <option value="">{catalog('allGenes')}</option>
            {geneOptions.map(item => <option key={item}>{item}</option>)}
          </select>
          <select aria-label={oncology('status')} value={status} onChange={event => setStatus(event.target.value)}
            className="rounded-md border border-border-default bg-canvas-default px-3 py-1.5 text-sm">
            <option value="">{oncology('status')}</option>
            {statuses.map(item => <option key={item} value={item}>{display(item)}</option>)}
          </select>
        </div>
        <span className="text-xs text-fg-muted">{oncology('count')} {matches.length.toLocaleString(t.locale)}</span>
      </div>
    </div>
    {state === 'ready' && data === null && !error && <p role="status" className="pb-2 text-xs text-fg-muted">{oncology('loading')}</p>}
    {error && <div role="alert" className="flex items-center gap-2 pb-2 text-sm text-danger-fg">
      {oncology('loadError')}
      <ActionButton size="small" variant="ghost" type="button" onClick={() => setRetry(value => value + 1)}>{oncology('retry')}</ActionButton>
    </div>}
    <DataTable className="variant-results-table min-h-0 flex-1" stickyHeader striped rowKey="id" density={view.density}
      columns={visible} data={matches} sortColumn={sort?.column} sortDirection={sort?.direction}
      onSortChange={(column, direction) => setSort(direction ? { column, direction } : undefined)}
      selectedRows={new Set(selected ? [selected.id] : [])} onRowClick={row => setSelectedId(row.id)} />
    <p className="shrink-0 pt-2 text-xs text-fg-muted">
      {catalog('referenceOnly')}{' '}
      <a href={clinpgxArchive.source} className="text-accent-fg hover:underline" target="_blank" rel="noreferrer">ClinPGx / PharmGKB · {clinpgxArchive.date}</a>
      {' · '}<a href={clinpgxArchive.license} className="text-accent-fg hover:underline" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
    </p>
    {selected && <OncologyResultInspector key={selected.id} taskId={taskId} tab="chemotherapy" row={{ ...selected, values: { ...selected.values, drug: value(selected, 'drug') ?? null } }}
      referenceGenome={referenceGenome} related={[]} sourceLinks={selected.sources.map(source => ({ ...source, label: source.category ? source.label + ' · ' + catalog(source.category === 'efficacy' ? 'efficacy' : 'toxicityRisk') : source.label }))} onNavigate={() => {}}
      historyRevision={0} onClose={() => { setSelectedId(null); if (activeRow) clearActiveRow(); }} />}
  </section>;
}
