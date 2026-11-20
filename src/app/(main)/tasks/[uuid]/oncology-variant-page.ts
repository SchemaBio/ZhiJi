import type { OncologyResultTable } from './oncology-results';
import type { PaginatedResult, SNVIndel, TableFilterState } from './types';

const columnTypes = {
  Gene: 'text', Chromosome: 'text', Position: 'number', Ref: 'text', Alt: 'text', Type: 'enum',
  Depth: 'number', VAF: 'number', GnomAD_AF: 'number', GnomAD_AF_EAS: 'number',
  ClinVar_Sig: 'text', acmgClassification: 'enum', Transcript: 'text', HGVS_c: 'text', HGVS_p: 'text',
  focused: 'boolean', pinned: 'boolean',
} as const;

function columns(row: SNVIndel): Record<string, string | number | boolean | undefined> {
  return {
    ...row.annotationValues,
    Gene: row.gene, Chromosome: row.chromosome, Position: row.position || undefined, Ref: row.ref, Alt: row.alt,
    Type: row.variantType, Depth: Number.isFinite(row.depth) ? row.depth : undefined, VAF: row.alleleFrequency,
    GnomAD_AF: row.gnomadAF, GnomAD_AF_EAS: row.gnomadEasAF, ClinVar_Sig: row.clinvarSignificance,
    acmgClassification: row.acmgClassification, Transcript: row.transcript, HGVS_c: row.hgvsc, HGVS_p: row.hgvsp,
    focused: row.focused, pinned: row.pinned,
  };
}

function matchesCell(cell: ReturnType<typeof columns>[string], filter: NonNullable<TableFilterState['columnFilters']>[number]) {
  const missing = cell == null || cell === '';
  if (filter.operator === 'is_missing') return missing;
  if (filter.operator === 'is_not_missing') return !missing;
  if (missing || filter.value == null) return false;
  const text = (value: string) => (filter.column === 'Chromosome' ? value.replace(/^chr/i, '') : value).toLowerCase();
  const actual = text(String(cell));
  const target = text(String(filter.value));
  const number = Number(actual), limit = Number(target);
  switch (filter.operator) {
    case 'contains': return actual.includes(target);
    case 'not_contains': return !actual.includes(target);
    case 'equals': return actual === target;
    case 'in': return (Array.isArray(filter.value) ? filter.value : [filter.value]).some(value => text(value) === actual);
    case 'gt': return number > limit;
    case 'gte': return number >= limit;
    case 'lt': return number < limit;
    case 'lte': return number <= limit;
    case 'between': return Array.isArray(filter.value) && number >= Number(filter.value[0]) && number <= Number(filter.value[1]);
  }
}

const sortFields: Record<string, string> = {
  gene: 'Gene', position: 'Position', depth: 'Depth', alleleFrequency: 'VAF', gnomadAF: 'GnomAD_AF',
  gnomadEasAF: 'GnomAD_AF_EAS', clinvarSignificance: 'ClinVar_Sig',
};

export function pageOncologyVariants(table: OncologyResultTable, state: TableFilterState, genes?: readonly string[]): PaginatedResult<SNVIndel> {
  const query = state.searchQuery.trim().toLowerCase();
  const classification = state.filters.acmgClassification;
  const rows = table.rows.flatMap(row => {
    if (!row.variant) return [];
    const variant = { ...row.variant, id: row.id, oncologyDetails: { values: row.values, details: row.details, related: row.related }, focused: row.focused ?? row.variant.focused, pinned: row.pinned ?? row.variant.pinned,
      adjustmentVersion: row.adjustmentVersion ?? row.variant.adjustmentVersion };
    const fields = columns(variant);
    if (query && ![variant.gene, variant.hgvsc, variant.hgvsp, variant.rsId, variant.position || '', variant.position ? variant.chromosome + ':' + variant.position : '']
      .some(value => String(value ?? '').toLowerCase().includes(query.replace(/^chr(?=\d|[xym]:)/, '')))) return [];
    if (genes && !genes.includes(variant.gene)) return [];
    if (classification && ![classification].flat().includes(variant.acmgClassification ?? '')) return [];
    if (state.columnFilters?.some(filter => !matchesCell(fields[filter.column], filter))) return [];
    return [{ variant, fields }];
  });
  const priority = (row: SNVIndel) => row.focused ? 0 : row.pinned ? 1 : 2;
  rows.sort((a, b) => {
    const marks = priority(a.variant) - priority(b.variant);
    if (marks || !state.sortColumn) return marks;
    const field = sortFields[state.sortColumn] ?? state.sortColumn;
    const left = a.fields[field], right = b.fields[field];
    if (left == null) return right == null ? 0 : 1;
    if (right == null) return -1;
    const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true });
    return state.sortDirection === 'desc' ? -order : order;
  });
  return { data: rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize).map(row => row.variant),
    total: rows.length, page: state.page, pageSize: state.pageSize, columns: Object.keys(columnTypes), columnTypes };
}
