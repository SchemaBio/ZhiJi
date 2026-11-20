'use client';
import { useText } from '@/i18n/useText';
import { chineseText, translateUI, type TextTranslator } from '@/i18n/text';

import { HoverHint } from '@/components/shared/HoverHint';


import { CheckCircle2, Clock3, FileWarning } from 'lucide-react';
import type { TrioMember } from '@/lib/sample-parents';
import type { ResultContext, TabConfig, TabType } from '../types';
import { isOncologyResultTab, SNV_INDEL_LABEL } from '../oncology-results';
import { KinshipTable } from './KinshipTable';
import { CopyTableButton } from './CopyTableButton';
import { QCAndFamilyTables, OncologyQCCards, SampleFamilyTable, type VerificationSample } from './QCResultTab';

const TYPE_LABELS: Array<{ key: string; label: string; tab: TabType }> = [
  { key: 'snv-indel', label: SNV_INDEL_LABEL, tab: 'snv-indel' },
  { key: 'cnv-segment', label: 'CNV 区段', tab: 'cnv-segment' },
  { key: 'cnv-exon', label: 'CNV 外显子', tab: 'cnv-exon' },
  { key: 'str', label: 'STR', tab: 'str' },
  { key: 'mei', label: 'MEI', tab: 'mei' },
  { key: 'mt', label: '线粒体', tab: 'mt' },
  { key: 'upd', label: 'UPD', tab: 'upd' },
  { key: 'roh', label: 'ROH', tab: 'roh' },
];

// Count variant records. Coverage targets, biomarkers and predictions have their own result units.
const ONCOLOGY_COUNT_TABS = new Set<TabType>(['snv-indel', 'cnv-gene', 'fusion', 'cnv-chrom', 'germline']);

function stateDescription(context: ResultContext, t: TextTranslator = chineseText) {
  switch (context.state) {
    case 'ready': return { title: t("tasks.analysisResultsbc2c61"), detail: '', icon: CheckCircle2, tone: 'text-success-fg bg-success-subtle border-success-emphasis' };
    case 'importing': return { title: t("tasks.importingResultsd59f3c"), detail: t("tasks.preparingResultsThePageRefreshesAutomatically266b8b"), icon: Clock3, tone: 'text-warning-fg bg-warning-subtle border-warning-emphasis' };
    case 'import_failed': return { title: t("tasks.resultImportFailed81188a"), detail: t("tasks.archivedResultsAreNotFullyImportedRetryb18849"), icon: FileWarning, tone: 'text-danger-fg bg-danger-subtle border-danger-emphasis' };
    case 'workflow_running': return { title: t("tasks.noResultsYete7740c"), detail: t("tasks.resultsAppearHereAfterAnalysisCompletesa4b106"), icon: Clock3, tone: 'text-accent-fg bg-accent-subtle border-accent-emphasis' };
    default: return { title: t("tasks.awaitingResultse528ba"), detail: t("tasks.thisExecutionHasNoInterpretableResultsYetef240a"), icon: Clock3, tone: 'text-fg-muted bg-canvas-subtle border-border-default' };
  }
}

export function ResultOverview({ context, onNavigate, sample, snapshot = [], oncologyTabs, paired }: { context: ResultContext; onNavigate: (tab: TabType) => void; sample?: VerificationSample|null; snapshot?: TrioMember[]; oncologyTabs?: TabConfig[]; paired?: boolean }) {
  const t = useText();
  const state = context.parquet?.available && context.importStatus === 'failed'
    ? { title: t("tasks.auxiliaryDataImportIncompleteb857ca"), detail: t("tasks.rawDetectionTablesAreAvailableSomeAuxiliary01772e"), icon: CheckCircle2, tone: 'text-success-fg bg-success-subtle border-success-emphasis' }
    : stateDescription(context, t);
  const StateIcon = state.icon;
  const snvOnly = Boolean(context.vcfAnnotation) || Boolean(context.capabilities?.includes('snv_indel') && !context.capabilities.includes('qc'));
  const modules = oncologyTabs
    ? oncologyTabs.filter(tab => ONCOLOGY_COUNT_TABS.has(tab.id)).map(tab => ({ key: tab.id, label: tab.label, tab: tab.id }))
    : TYPE_LABELS.filter(item => !snvOnly || item.key === 'snv-indel');
  const counts = modules.map(item => {
    const unqueried = Boolean(context.parquet?.available && context.parquet.tables.includes(item.key) && !context.parquet.preparedTables.includes(item.key));
    const summary = isOncologyResultTab(item.tab) ? context.oncology?.[item.tab] : undefined;
    const count = context.types[item.key] ?? (summary?.state === 'ready' && typeof summary.total === 'number' ? { total: summary.total, focused: undefined } : undefined);
    const status = summary && summary.state !== 'ready' ? t('oncologyResults.' + summary.state) : undefined;
    const known = Boolean(count) && !unqueried && !status;
    return { ...item, count, known, status: status ?? (unqueried ? t("tasks.awaitingQuery800bbc") : !count ? t("history.notProvided071fb2") : count.total === 0 ? t("tasks.noDetectionsc68a8a") : t("tasks.loadedb19bae")) };
  });
  const value = (item: typeof counts[number], key: 'total' | 'focused') => {
    const amount = item.count?.[key];
    return item.known && typeof amount === 'number' && Number.isFinite(amount) ? amount.toLocaleString(t.locale) : '—';
  };
  const rows = [
    [t("tasks.resultTypec76229"), t("tasks.detectionCount853e60"), t("tasks.focus6c4cc0"), t("tasks.dataStatusf024b4")],
    ...counts.map(item => [t(item.label), value(item, 'total'), value(item, 'focused'), item.status]),
  ];
  const allKnown = counts.length > 0 && counts.every(item => item.known);
  const loaded = counts.filter(item => item.known);
  const loadedTotal = (key: 'total' | 'focused') => loaded.length && loaded.every(item => Number.isFinite(item.count?.[key])) ? loaded.reduce((sum, item) => sum + (item.count?.[key] ?? 0), 0).toLocaleString(t.locale) : '—';
  const totals = (['total', 'focused'] as const).map(key => allKnown ? loadedTotal(key) : '—');
  rows.push([t("tasks.total92bcbf"), ...totals, allKnown ? t("tasks.completeStatistics44af69") : t("tasks.someDataNotReady796729")]);

  return (
    <section className={oncologyTabs ? "yj-oncology-overview space-y-4 p-3 md:p-4" : "space-y-4 p-4"} aria-labelledby="result-overview-heading">
      <h2 id="result-overview-heading" className="sr-only">{t("tasks.resultsOverview068a6d")}</h2>
      {(context.state!=='ready'||context.importStatus==='failed')&&<div className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 ${state.tone}`}>
        <StateIcon className="h-5 w-5 shrink-0" />
        <div><h3 className="font-semibold">{translateUI(state.title, t)}</h3><p className="mt-0.5 text-sm">{state.detail}</p></div>
        <span className="ml-auto shrink-0 rounded bg-canvas-default/70 px-3 py-2 text-xs">{context.reference.declaredId || t("tasks.unknownReference15bf46")}</span>
      </div>}

      <div className="yj-overview-metrics">
        <div><span>{oncologyTabs ? t(allKnown ? "oncologyQc.variantRecords" : "oncologyQc.loadedVariantRecords") : t(allKnown ? "tasks.detectedVariants146453" : "tasks.loadedDetections3b16ad")}</span><strong>{loadedTotal('total')}</strong></div>
        <div><span>{allKnown ? t("history.includeInFocus233738") : t("tasks.loadedFocusSelections5e560a")}</span><strong>{loadedTotal('focused')}</strong></div>
        <div><span>{t("tasks.analysisMembers11d031")}</span><strong>{context.members.length ? context.members.length.toLocaleString(t.locale) : '—'}</strong></div>
        <div><span>{t("pipeline.referenceGenome903ba5")}</span><strong>{context.reference.declaredId || t("history.notProvided071fb2")}</strong></div>
      </div>

      <div className={oncologyTabs ? "yj-oncology-overview-columns" : "grid items-start gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"}>
      <div className={oncologyTabs ? "min-w-0 space-y-3" : "space-y-3"}>
      {counts.length > 0 && <section aria-labelledby="result-counts-heading" className="overflow-hidden rounded-lg border border-border-default bg-canvas-default">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default px-3 py-2">
          <div><h3 id="result-counts-heading" className="text-sm font-semibold text-fg-default">{t("tasks.resultTypeOverviewff056f")}</h3></div>
          <CopyTableButton rows={rows} label={t("tasks.copy4edd1d")} />
        </header>
        <div className="overflow-x-auto">
          <table className="w-full select-text border-collapse text-left text-sm">
            <thead className="bg-canvas-subtle text-xs text-fg-muted"><tr>{rows[0].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">{label}</th>)}</tr></thead>
            <tbody>{counts.map(item => (
              <tr key={item.key} className="border-t border-border-default hover:bg-canvas-subtle/50">
                <th scope="row" className="whitespace-nowrap px-3 py-2 font-medium text-fg-default"><HoverHint content={t("tasks.view48e5d7", {p0: t(item.label)})}><button type="button" onClick={() => onNavigate(item.tab)} className="text-accent-fg hover:underline" >{translateUI(item.label, t)}</button></HoverHint></th>
                {(['total', 'focused'] as const).map(key => <td key={key} className="px-3 py-2 tabular-nums text-fg-default">{value(item, key)}</td>)}
                <td className="whitespace-nowrap px-3 py-2 text-xs text-fg-muted">{item.status}</td>
              </tr>
            ))}</tbody>
            <tfoot className="border-t border-border-default bg-canvas-subtle font-medium text-fg-default"><tr><th scope="row" className="px-3 py-2">{t("tasks.total92bcbf")}</th>{totals.map((total, index) => <td key={index} className="px-3 py-2 tabular-nums">{total}</td>)}<td colSpan={1} className="px-3 py-2 text-xs font-normal text-fg-muted">{allKnown ? t("tasks.completeStatistics44af69") : t("tasks.someDataNotReady796729")}</td></tr></tfoot>
          </table>
        </div>
        <p className="border-t border-border-default px-3 py-2 text-xs text-fg-muted">{t("tasks.focusSelectionDoesNotMeanAFormal8d65d4")}</p>
      </section>}

      {oncologyTabs ? <OncologyQCCards context={context} sample={sample} paired={paired} annotationOnly={snvOnly} />
        : <SampleFamilyTable context={context} sample={sample} snapshot={snapshot} sexMethod={snvOnly?'chrX':'sry'} />}
      </div>
      {snvOnly?<VCFPreprocessingTable context={context}/>:<QCAndFamilyTables context={context} sample={sample} snapshot={snapshot} oncology={Boolean(oncologyTabs)} />}
      </div>

      {!oncologyTabs && !snvOnly && context.kinship && <KinshipTable context={context} sample={sample} snapshot={snapshot} />}

      {!context.reference.available&&<p className="text-xs text-warning-fg">{context.reference.reason || t("tasks.referenceResourcesAreNotConfiguredSequencingEvidence9cfc0a")}</p>}
    </section>
  );
}

function VCFPreprocessingTable({context}:{context:ResultContext}) {
  const t=useText();
  const data=context.vcfAnnotation?.preprocessing;
  const definitions=[['input_records','vcfAnnotation.inputRecords'],['normalized_variants','vcfAnnotation.normalizedVariants'],['excluded_reference_gt','vcfOverview.referenceExcluded'],['excluded_missing_or_partial_gt','vcfOverview.missingExcluded'],['excluded_unsupported_type','vcfOverview.unsupportedExcluded']];
  const rows=[[t('tasks.metric1dfc81'),t('vcfOverview.recordCount')],...definitions.map(([key,label])=>[t(label),typeof data?.[key]==='number'?(data[key] as number).toLocaleString(t.locale):t('history.notProvided071fb2')])];
  return <section aria-labelledby="vcf-preprocessing-heading" className="overflow-hidden rounded-lg border border-border-default bg-canvas-default">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default px-3 py-2">
      <h3 id="vcf-preprocessing-heading" className="text-sm font-semibold text-fg-default">{t('vcfOverview.preprocessing')}</h3>
      <CopyTableButton rows={rows} label={t('tasks.copy4edd1d')}/>
    </header>
    <div className="overflow-x-auto"><table className="w-full select-text border-collapse text-left text-sm">
      <thead className="bg-canvas-subtle text-xs text-fg-muted"><tr>{rows[0].map(label=><th key={label} scope="col" className="px-3 py-2 font-medium">{label}</th>)}</tr></thead>
      <tbody>{rows.slice(1).map(row=><tr key={row[0]} className="border-t border-border-default"><th scope="row" className="px-3 py-2 font-normal text-fg-default">{row[0]}</th><td className="px-3 py-2 tabular-nums text-fg-default">{row[1]}</td></tr>)}</tbody>
    </table></div>
  </section>;
}
