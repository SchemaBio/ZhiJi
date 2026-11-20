'use client';

import { useId, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { InspectorTabs, WorkspaceInspector, type InspectorSection } from '@/components/shared/WorkspaceInspector';
import { useText } from '@/i18n/useText';
import { getMessages } from '@/i18n/messages';
import { oncologyColumnValue, oncologyResultModules, oncologyReviewTables, type OncologyCNVSegment, type OncologyResultRow, type OncologyResultTab } from '../oncology-results';
import { ResultChangeHistory } from './ResultChangeHistory';

type Related = NonNullable<OncologyResultRow['related']>[number];
type DetailSection = 'overview' | 'annotation' | 'evidence';
type DetailGroup = { title: string; fields: string[] };
type DetailLayout = { title: string; summary?: string[]; sections: Partial<Record<DetailSection, DetailGroup[]>> };

const group = (title: string, ...fields: string[]): DetailGroup => ({ title, fields });
const layouts: Partial<Record<OncologyResultTab, DetailLayout>> = {
  'cnv-gene': {
    title: 'gene',
    summary: ['event', 'tier', 'qc'],
    sections: {
      overview: [group('copyState', 'copies', 'majorCopies', 'minorCopies', 'loh'), group('affectedRegion', 'position', 'scope', 'geneCoverage', 'exons')],
      annotation: [group('affectedRegion', 'position', 'transcript', 'exons', 'scope', 'geneCoverage'), group('provenance', 'database', 'cancer', 'evidence')],
      evidence: [group('signal', 'logRatio', 'baf', 'supportingBins', 'segments'), group('provenance', 'purity', 'ploidy', 'method', 'qc')],
    },
  },
  'cnv-chrom': {
    title: 'chromosome',
    summary: ['event', 'loh', 'qc'],
    sections: {
      overview: [group('affectedRegion', 'interval', 'length', 'fraction'), group('copyState', 'copies', 'majorCopies', 'minorCopies', 'loh')],
      annotation: [group('affectedRegion', 'chromosome', 'interval', 'length', 'scope'), group('provenance', 'cancer', 'database')],
      evidence: [group('signal', 'logRatio', 'baf', 'segmentCount', 'supportingBins', 'segments'), group('provenance', 'purity', 'ploidy', 'method', 'qc')],
    },
  },
  fusion: {
    title: 'gene5',
    summary: ['source', 'frame', 'confidence'],
    sections: {
      overview: [group('fusionSupport', 'splitReads', 'spanningPairs', 'confidence', 'review')],
      annotation: [group('functionalAnnotation', 'frame', 'domains', 'tier', 'database')],
      evidence: [group('fusionSupport', 'splitReads', 'spanningPairs', 'confidence'), group('provenance', 'assaySample', 'source', 'method', 'qc')],
    },
  },
  chemotherapy: {
    title: 'gene',
    summary: ['phenotype'],
    sections: {
      overview: [group('pharmacogenomics', 'drug', 'status', 'genotype', 'activityScore', 'phenotype', 'efficacy', 'toxicityRisk', 'alleleFunction')],
      annotation: [group('siteAnnotation', 'marker', 'markerType', 'locus', 'hgvs', 'alleles', 'transcript'), group('provenance', 'assaySample', 'sampleSource')],
      evidence: [group('guidelineEvidence', 'guideline', 'evidence', 'guidelineVersion', 'database', 'interpretation', 'lowerRiskGenotypes', 'elevatedRiskGenotypes', 'proxyEvidence'), group('provenance', 'assaySample', 'sampleSource', 'depth', 'qc', 'method')],
    },
  },
  neoantigen: {
    title: 'variant',
    summary: ['hla'],
    sections: {
      overview: [group('hlaAndExpression', 'hla', 'peptideLength', 'expression')],
      annotation: [group('siteAnnotation', 'variant', 'gene', 'position', 'transcript'), group('hlaAndExpression', 'hla', 'hlaSource')],
      evidence: [group('expressionEvidence', 'expression', 'tumorVaf', 'rnaVaf', 'rnaDepth'), group('provenance', 'method', 'hlaSource', 'assaySample')],
    },
  },
  biomarkers: {
    title: 'metric',
    summary: ['status'],
    sections: {
      overview: [group('indicatorResult', 'result', 'interpretation', 'status')],
      annotation: [group('indicatorInputs', 'analyzableSites', 'analyzableMb', 'variantCount', 'coo', 'geneticSubtype', 'loh', 'detail.TAI', 'detail.LST')],
      evidence: [group('provenance', 'method', 'threshold', 'confidence', 'qc')],
    },
  },
};

const breakpointFields = ['gene5', 'gene3', 'exon5', 'exon3', 'breakpoint5', 'breakpoint3', 'strand5', 'strand3', 'transcript5', 'transcript3'];
const peptideFields = ['peptide', 'wildPeptide', 'affinity', 'wildAffinity', 'rank', 'wildRank'];

function chromosomeGroups(segments: OncologyCNVSegment[] = []) {
  const groups = new Map<string, OncologyCNVSegment[]>();
  for (const segment of segments) {
    if (!segment.chromosome || !Number.isSafeInteger(segment.start) || !Number.isSafeInteger(segment.end) ||
      segment.start < 0 || segment.end <= segment.start) continue;
    const chromosome = groups.get(segment.chromosome) ?? [];
    chromosome.push(segment);
    groups.set(segment.chromosome, chromosome);
  }
  return [...groups.entries()].map(([chromosome, values]) =>
    [chromosome, values.sort((a, b) => a.start - b.start || a.end - b.end)] as const);
}

export function OncologyResultInspector({ taskId, tab, row, referenceGenome, related, sourceLinks = [], onNavigate, onClose, historyRevision }: {
  taskId: string;
  tab: OncologyResultTab;
  row: OncologyResultRow;
  referenceGenome?: string;
  related: Related[];
  sourceLinks?: { href: string; label: string }[];
  onNavigate: (link: Related) => void;
  onClose: () => void;
  historyRevision: number;
}) {
  const t = useText();
  const id = useId();
  const [section, setSection] = useState<InspectorSection>('overview');
  const config = oncologyResultModules[tab];
  const layout = layouts[tab] ?? { title: config.columns[0], sections: { overview: [], annotation: [], evidence: [] } };
  const labels = getMessages(t.locale).oncologyResults;
  const pgxLabels = getMessages(t.locale).chemotherapyCatalog;
  const label = (key: string) => key.startsWith('detail.') ? key.slice(7)
    : typeof labels === 'object' && Object.hasOwn(labels, key) ? t('oncologyResults.' + key)
      : typeof pgxLabels === 'object' && Object.hasOwn(pgxLabels, key) ? t('chemotherapyCatalog.' + key) : key;
  const detail = (key: string) => t('oncologyDetail.' + key);
  const render = (value: ReturnType<typeof oncologyColumnValue>) => {
    if (value == null || value === '') return '—';
    if (typeof value === 'number') return value.toLocaleString(t.locale, { maximumFractionDigits: 6 });
    return value.startsWith('oncologyResults.') || value.startsWith('chemotherapyCatalog.') ? t(value) : value;
  };
  const value = (key: string) => oncologyColumnValue(row, key);
  const visible = (key: string) => value(key) != null && value(key) !== '';
  const renderFields = (fields: string[]) => <dl className="divide-y divide-border-subtle">
    {fields.map(key => <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-3 py-2 text-sm">
      <dt className="text-fg-muted">{label(key)}</dt>
      <dd className="min-w-0 break-words text-fg-default">{render(value(key))}</dd>
    </div>)}
  </dl>;
  const title = tab === 'fusion' ? render(value('gene5')) + ' → ' + render(value('gene3')) : render(value(layout.title));
  const sections: InspectorSection[] = ['overview', 'annotation', 'evidence'];
  if (oncologyReviewTables.has(tab)) sections.push('history');

  const used = new Set([layout.title, ...(layout.summary ?? []),
    ...Object.values(layout.sections).flatMap(groups => groups.flatMap(item => item.fields)),
    ...(tab === 'fusion' ? [...breakpointFields, 'partners', 'exons', 'transcript'] : []),
    ...(tab === 'neoantigen' ? peptideFields : []), 'related',
  ]);
  const extras = [...new Set([...Object.keys(row.values), ...Object.keys(row.details ?? {})])]
    .filter(key => !used.has(key) && visible(key));
  const groups = section === 'history' ? [] : layout.sections[section as DetailSection] ?? [];
  const cnv = tab === 'cnv-gene' || tab === 'cnv-chrom';
  const segmentGroups = cnv ? chromosomeGroups(row.cnvSegments) : [];
  const fraction = value('fraction');
  const showFraction = tab === 'cnv-chrom' && section === 'overview' &&
    typeof fraction === 'number' && Number.isFinite(fraction) && fraction >= 0 && fraction <= 100;
  const showBreakpoints = tab === 'fusion' && (section === 'overview' || section === 'annotation');
  const showPeptideComparison = tab === 'neoantigen' && section === 'overview';
  const showSegments = cnv && section === 'evidence' && segmentGroups.length > 0;
  const presentedGroups = groups.map(item => ({ ...item, fields: item.fields.filter(visible) })).filter(item => item.fields.length > 0);

  return <WorkspaceInspector label={label('details')} onClose={onClose}>
    <header className="flex shrink-0 items-start justify-between gap-2 border-b border-border-default bg-canvas-subtle px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-fg-muted">{label(config.label)}</p>
        <h3 className="break-words text-base font-semibold text-fg-default">{title}</h3>
      </div>
      <button type="button" aria-label={label('close')} className="shrink-0 rounded p-1 hover:bg-canvas-default" onClick={onClose}><X size={17} /></button>
    </header>
    {(referenceGenome || layout.summary?.some(visible)) && <div className="yj-inspector-summary flex flex-wrap items-center gap-2">
      {referenceGenome && <span className="font-medium text-fg-default">{referenceGenome}</span>}
      {layout.summary?.filter(visible).map(key => <span key={key} className="rounded border border-border-subtle bg-canvas-default px-1.5 py-0.5 text-fg-default">{render(value(key))}</span>)}
    </div>}
    <InspectorTabs id={id} value={section} onChange={setSection} sections={sections} labels={{ overview: detail('overview') }} />
    <div key={section} id={id + '-content'} role="tabpanel" aria-labelledby={id + '-' + section} className="yj-inspector-content">
      <div className="space-y-4">
        {section === 'history' && <ResultChangeHistory taskId={taskId} table={tab} rowId={row.id} active revision={historyRevision} />}
        {showFraction && <section className="rounded-lg border border-border-default p-3">
          <p className="mb-1 text-xs text-fg-muted">{label('fraction')} · {render(fraction)}%</p>
          <meter className="block w-full" aria-label={label('fraction')} min={0} max={100} value={fraction} />
        </section>}
        {showBreakpoints && <section aria-label={detail('breakpoints')} className="space-y-2">
          <h4 className="text-sm font-semibold">{detail('breakpoints')}</h4>
          <div className="grid grid-cols-2 gap-2">
            {(['5', '3'] as const).map(side => <div key={side} className="min-w-0 rounded-lg border border-border-default px-2.5 py-2">
              <p className="text-xs text-fg-muted">{side}′</p>
              <p className="break-words font-semibold text-accent-fg">{render(value('gene' + side))}</p>
              {renderFields(['exon', 'breakpoint', 'transcript', 'strand'].map(key => key + side).filter(visible))}
            </div>)}
          </div>
        </section>}
        {showPeptideComparison && <section aria-label={detail('peptideComparison')} className="space-y-2">
          <h4 className="text-sm font-semibold">{detail('peptideComparison')}</h4>
          <div className="overflow-x-auto rounded-lg border border-border-default">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas-subtle text-xs text-fg-muted"><tr>
                <th scope="col" className="px-2 py-2">{label('metric')}</th>
                <th scope="col" className="px-2 py-2">{detail('mutant')}</th>
                <th scope="col" className="px-2 py-2">{detail('wildType')}</th>
              </tr></thead>
              <tbody>{([['sequence', 'peptide', 'wildPeptide'], ['bindingAffinity', 'affinity', 'wildAffinity'], ['percentileRank', 'rank', 'wildRank']] as const)
                .map(([heading, mutant, wild]) => <tr key={heading} className="border-t border-border-subtle">
                  <th scope="row" className="whitespace-nowrap px-2 py-2 font-medium">{detail(heading)}</th>
                  {[mutant, wild].map(key => <td key={key} className={'px-2 py-2 tabular-nums ' + (heading === 'sequence' ? 'font-mono' : '')}>{render(value(key))}</td>)}
                </tr>)}</tbody>
            </table>
          </div>
          <p className="text-xs text-fg-muted">{label('prediction')}</p>
        </section>}
        {showSegments && <section aria-label={detail('segmentProfile')} className="space-y-2">
          <h4 className="text-sm font-semibold">{detail('segmentProfile')}</h4>
          {segmentGroups.map(([chromosome, segments]) => {
            const start = segments[0].start;
            const end = segments.reduce((max, item) => Math.max(max, item.end), start);
            const span = end - start;
            return <div key={chromosome} className="space-y-2 rounded-lg border border-border-default p-2">
              <div className="flex justify-between gap-2 text-xs tabular-nums text-fg-muted">
                <span>{chromosome}:{render(start)}</span><span>{render(end)}</span>
              </div>
              <div aria-hidden="true" className="relative h-3 rounded bg-canvas-subtle">
                {segments.map((item, i) => <span key={i} className="absolute h-full rounded border border-accent-emphasis bg-accent-subtle"
                  style={{ left: (item.start - start) / span * 100 + '%', width: (item.end - item.start) / span * 100 + '%' }} />)}
              </div>
              <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-xs">
                <thead className="whitespace-normal text-fg-muted"><tr>{['interval', 'logRatio', 'copies', 'minorCopies'].map(key => <th key={key} scope="col" className="px-1 py-1 font-medium">{label(key)}</th>)}</tr></thead>
                <tbody>{segments.map((item, i) => <tr key={i} className="border-t border-border-subtle tabular-nums">
                  <th scope="row" className="px-1 py-1 font-medium">{render(item.start)}–{render(item.end)}</th>
                  {[item.logRatio, item.copies, item.minorCopies].map((amount, index) => <td key={index} className="px-1 py-1">{render(amount)}</td>)}
                </tr>)}</tbody>
              </table></div>
            </div>;
          })}
        </section>}
        {presentedGroups.map(item => <section key={item.title}>
          <h4 className="border-b border-border-subtle pb-1 text-sm font-semibold">{detail(item.title)}</h4>
          {renderFields(item.fields)}
        </section>)}
        {section === 'evidence' && sourceLinks.length > 0 && <ul className="space-y-1 text-sm">
          {sourceLinks.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer"
            className="text-accent-fg hover:underline">{source.label}</a></li>)}
        </ul>}
        {extras.length > 0 && section === 'annotation' && <section>
          <h4 className="border-b border-border-subtle pb-1 text-sm font-semibold">{detail('additionalAnnotation')}</h4>
          {renderFields(extras)}
        </section>}
        {section !== 'history' && !presentedGroups.length && !showFraction && !showBreakpoints && !showPeptideComparison &&
          !showSegments && !(section === 'evidence' && sourceLinks.length > 0) && !(section === 'annotation' && extras.length) && <p className="text-sm text-fg-muted">{t('history.notProvided071fb2')}</p>}
      </div>
    </div>
    {related.length > 0 && <div className="shrink-0 border-t border-border-default px-4 py-2 text-sm">
      <p className="text-xs text-fg-muted">{label('related')}</p>
      <ul className="mt-1 space-y-1">
        {related.map(link => <li key={link.tab + ':' + link.id}><button type="button" className="inline-flex items-center gap-1 text-left text-accent-fg hover:underline" onClick={() => onNavigate(link)}>{render(link.label)} <ArrowRight size={14} aria-hidden="true" /></button></li>)}
      </ul>
    </div>}
  </WorkspaceInspector>;
}
