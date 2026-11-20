'use client';
import { snvSampleColumns } from './SNVSampleColumns';

import { useBusinessPermissions } from '@/components/providers/BusinessPermissionProvider';
import { pageOncologyVariants } from '../oncology-variant-page';
import type { SNVResultLocus } from '../oncology-results';
import { errorText } from '@/i18n/errors';

import { useText } from '@/i18n/useText';
import { translateUI, localizeDisplay } from '@/i18n/text';

import { ActionButton } from '@/components/shared/ActionButton';

import { HoverHint } from '@/components/shared/HoverHint';


import { GeneLinks } from './GeneLinks';

import * as React from 'react';
import { TableViewControls, useTableView } from '@/components/shared/TableViewControls';
import { DataTable, Input } from '@schema/ui-kit';
import { Tag } from '@/components/shared/Tag';
import type { Column } from '@schema/ui-kit';
import { Search, ListFilter } from 'lucide-react';
import type { SNVIndel, TableFilterState, PaginatedResult, ACMGEvidenceEntry, ACMGClassification } from '../types';
import { DEFAULT_FILTER_STATE } from '../types';
import { getSNVIndels, getOncologyResultTable, ACMG_CONFIG, getGeneLists, focusVariant, pinVariant, saveResultRowAdjustment, type GeneListOption } from '../result-api';
import { IGVViewer, PositionLink } from './IGVViewer';
import { VariantDetailPanel } from './VariantDetailPanel';
import { formatPopulationFrequency, sourceAnnotation, transcriptLocation } from '../utils/snv-annotations';
import { PinCheckbox, FocusCheckbox, PinColumnHeader, FocusColumnHeader } from './ReviewCheckboxes';
import { ClinVarBadge } from './ClinVarBadge';
import { ClinicalSignificanceBadge } from './ClinicalSignificanceBadge';
import { VariantTypeBadge } from './VariantTypeBadge';
import { filterableColumns, resultColumnLabels } from './ResultColumnFilter';
import { ParquetColumnFilterBar } from './ParquetColumnFilterBar';
import { ChromosomeFilter } from './ChromosomeFilter';

interface SNVIndelTabProps {
  taskId: string;
  table?: 'snv-indel' | 'hotspot' | 'germline';
  permissions?: import('../types').ResultContext['permissions'];
  onNavigate?: (tab: 'snv-indel', row: string, locus: SNVResultLocus) => void;
  linkedVariantId?: string | null;
  referenceGenome?: string;
  family?: boolean;
  filterState?: TableFilterState;
  onFilterChange?: (state: TableFilterState) => void;
}

export function SNVIndelTab({
  taskId,
  table = 'snv-indel',
  permissions,
  onNavigate,
  linkedVariantId,
  referenceGenome,
  family,
  filterState: externalFilterState,
  onFilterChange
}: SNVIndelTabProps) {
  const t = useText();
  const { hasPermission } = useBusinessPermissions();
  const supplemental = table !== 'snv-indel';
  const allowMarks = !supplemental || hasPermission('interpretation_reports.manage');
  const tableView = useTableView();
  const [internalFilterState, setInternalFilterState] = React.useState<TableFilterState>(DEFAULT_FILTER_STATE);
  const [result, setResult] = React.useState<PaginatedResult<SNVIndel> | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const scopeRef = React.useRef(taskId); scopeRef.current = taskId;
  const [loading, setLoading] = React.useState(true);
	const [requestError, setRequestError] = React.useState<string | null>(null);
	const [operationError, setOperationError] = React.useState<string | null>(null);
	const [pendingVariants, setPendingVariants] = React.useState<Set<string>>(() => new Set());
  const [geneLists, setGeneLists] = React.useState<GeneListOption[]>([]);
  const [reviewStatus, setReviewStatus] = React.useState<Record<string, { pinned: boolean; focused: boolean }>>({});
  React.useEffect(()=>{
    const sync=(event:Event)=>{const d=(event as CustomEvent).detail;if(d?.taskId===taskId&&d?.table===table){setReviewStatus({});if (supplemental) setReloadToken(value => value + 1);}};
    window.addEventListener('zhiji:result-overlays-synced',sync);
    return()=>window.removeEventListener('zhiji:result-overlays-synced',sync);
  },[taskId, table, supplemental]);

  // IGV 查看器状态
  const [igvState, setIgvState] = React.useState<{
    isOpen: boolean;
    chromosome: string;
    position: number;
  }>({ isOpen: false, chromosome: '', position: 0 });

  // 详情面板状态
  const [selectedVariant, setSelectedVariant] = React.useState<SNVIndel | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = React.useState(false);

  React.useEffect(() => { setSelectedVariant(null); setDetailPanelOpen(false); setReviewStatus({}); }, [taskId]);

  const filterState = externalFilterState ?? internalFilterState;
  const setFilterState = onFilterChange ?? setInternalFilterState;

  // 打开 IGV 查看器
  const handleOpenIGV = React.useCallback((chromosome: string, position: number) => {
    setIgvState({ isOpen: true, chromosome, position });
  }, []);

  // 关闭 IGV 查看器
  const handleCloseIGV = React.useCallback(() => {
    setIgvState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 点击行打开详情面板
  const handleRowClick = React.useCallback((variant: SNVIndel) => {
    setSelectedVariant(variant);
    setDetailPanelOpen(true);
  }, []);

  const openedLink = React.useRef<string | null>(null);
  React.useEffect(() => { openedLink.current = null; }, [taskId, linkedVariantId]);
  React.useEffect(() => {
    if (!linkedVariantId || openedLink.current === linkedVariantId) return;
    const variant = result?.data.find(row => row.id === linkedVariantId);
    if (!variant) return;
    openedLink.current = linkedVariantId;
    handleRowClick(variant);
  }, [handleRowClick, linkedVariantId, result, taskId]);

  // 关闭详情面板
  const handleCloseDetailPanel = React.useCallback(() => {
    setDetailPanelOpen(false);
  }, []);

  // 处理置顶状态变更
  const handlePinChange = React.useCallback((id: string, checked: boolean, currentState: { pinned: boolean; focused: boolean }) => {
    setReviewStatus(prev => ({
      ...prev,
      [id]: { ...currentState, pinned: checked }
    }));
		setPendingVariants(previous => new Set(previous).add(id));
		setOperationError(null);
		void pinVariant(taskId, table, id, checked).then(() => { if (supplemental) setReloadToken(value => value + 1); }).catch(cause => {
			setReviewStatus(prev => ({ ...prev, [id]: currentState }));
			setOperationError(cause instanceof Error ? errorText(cause, t) : t("tasks.unableToSavePinStatus87ecc4"));
		}).finally(() => setPendingVariants(previous => {
			const next = new Set(previous); next.delete(id); return next;
		}));
  }, [taskId, table, supplemental, t]);

  // 处理关注状态变更
  const handleFocusChange = React.useCallback((id: string, checked: boolean, currentState: { pinned: boolean; focused: boolean }) => {
    setReviewStatus(prev => ({
      ...prev,
      [id]: { ...currentState, focused: checked }
    }));
		setPendingVariants(previous => new Set(previous).add(id));
		setOperationError(null);
		void focusVariant(taskId, table, id, checked).then(() => { if (supplemental) setReloadToken(value => value + 1); }).catch(cause => {
			setReviewStatus(prev => ({ ...prev, [id]: currentState }));
			setOperationError(cause instanceof Error ? errorText(cause, t) : t("tasks.unableToSaveFocusSelection594b1f"));
		}).finally(() => setPendingVariants(previous => {
			const next = new Set(previous); next.delete(id); return next;
		}));
  }, [taskId, table, supplemental, t]);

  // 获取变异的置顶状态
  const getReviewState = React.useCallback((variant: SNVIndel) => {
    return reviewStatus[variant.id] ?? { pinned: variant.pinned, focused: variant.focused };
  }, [reviewStatus]);

	const sortedData = result?.data ?? [];
	const [searchInput, setSearchInput] = React.useState(filterState.searchQuery);
	React.useEffect(() => setSearchInput(filterState.searchQuery), [filterState.searchQuery]);
	React.useEffect(() => {
		const timer = window.setTimeout(() => {
			if (searchInput !== filterState.searchQuery) setFilterState({ ...filterState, searchQuery: searchInput, page: 1 });
		}, 300);
		return () => window.clearTimeout(timer);
	}, [filterState, searchInput, setFilterState]);

  // 加载基因列表
  React.useEffect(() => {
    async function loadGeneLists() {
      try{const lists=await getGeneLists();setGeneLists(lists)}catch(e){setRequestError(e instanceof Error ? errorText(e, t):t("tasks.unableToLoadGeneListsa25a82"))}
    }
    loadGeneLists();
  }, []);

  const selectedGeneList = geneLists.find(list => list.id === filterState.geneListId);

  // 加载数据
  React.useEffect(() => {
		const controller = new AbortController();
    async function loadData() {
      setLoading(true);
		setRequestError(null);
		try {
			const data = table === 'snv-indel'
        ? await getSNVIndels(taskId, filterState, controller.signal)
        : pageOncologyVariants(await getOncologyResultTable(taskId, table, controller.signal), filterState, selectedGeneList?.genes);
			if (!controller.signal.aborted) setResult(data);
		} catch (cause) {
			if (!controller.signal.aborted) setRequestError(cause instanceof Error ? errorText(cause, t) : t("tasks.unableToLoadSnpIndelResultsbf689c"));
		} finally {
			if (!controller.signal.aborted) setLoading(false);
		}
    }
		void loadData();
		return () => controller.abort();
  }, [taskId, table, filterState, reloadToken, selectedGeneList]);

  // 处理搜索
  // 处理排序
  const handleSortChange = React.useCallback((column: string, direction: 'asc' | 'desc' | null) => {
    setFilterState({
      ...filterState,
      sortColumn: direction ? column : undefined,
      sortDirection: direction ?? undefined,
    });
  }, [filterState, setFilterState]);

  // 处理ACMG筛选
  const handleACMGFilter = React.useCallback((classification: ACMGClassification | '') => {
    const newFilters = { ...filterState.filters };
    if (classification) {
      newFilters.acmgClassification = classification;
    } else {
      delete newFilters.acmgClassification;
    }
    setFilterState({ ...filterState, filters: newFilters, page: 1 });
  }, [filterState, setFilterState]);

  // 处理基因列表筛选
  const handleGeneListFilter = React.useCallback((geneListId: string) => {
    setFilterState({
      ...filterState,
      geneListId: geneListId || undefined,geneListRevision:geneLists.find(x=>x.id===geneListId)?.revision,
      page: 1
    });
  }, [filterState, setFilterState,geneLists]);

  const handleUpdateClassification = React.useCallback(async (variant: SNVIndel, evidence: ACMGEvidenceEntry[], override: ACMGClassification | '', overrideReason: string, reason: string, reset = false) => {
    const saved = await saveResultRowAdjustment(taskId, table, variant.id, variant.adjustmentVersion ?? 0, reset ? { resetAcmg: true } : {
      acmgEvidence: evidence,
      acmgOverride: override,
      acmgOverrideReason: overrideReason,
    }, reason);
    if (scopeRef.current !== taskId) return;
    setReloadToken(value => value + 1);
    setSelectedVariant(current => current?.id !== variant.id ? current : {
      ...variant,
      acmgEvidence: evidence,
      acmgOverride: override || undefined,
      acmgOverrideReason: overrideReason,
      legacyAcmgClassification: reset ? variant.automaticAcmg?.classification : saved.adjustment.adjustments.acmgClassification as ACMGClassification | undefined,
      acmgClassification: variant.activeAcmgVersion==='svcv4' ? variant.svcv4Assessment?.result?.classification??undefined : reset ? variant.automaticAcmg?.classification : saved.adjustment.adjustments.acmgClassification as ACMGClassification | undefined,
      acmgState: String(saved.adjustment.adjustments.acmgState ?? ''),
      acmgAssessmentSource: reset ? 'automatic' : override ? 'manual_override' : 'manual_evidence',
      acmgCriteria: evidence.map(item => item.code),
      adjustmentVersion: saved.adjustment.version,
    });
  }, [taskId, table]);

  const handleSaveInterpretation = React.useCallback(async (variant: SNVIndel, interpretation: string, reason: string) => {
    const saved = await saveResultRowAdjustment(taskId, table, variant.id, variant.adjustmentVersion ?? 0, { interpretation }, reason);
    if (scopeRef.current !== taskId) return;
    setReloadToken(value => value + 1);
    setSelectedVariant(current => current?.id !== variant.id ? current : { ...current, interpretation, adjustmentVersion: saved.adjustment.version });
  }, [taskId, table]);

  const handleSaveVersionedAssessment=React.useCallback(async(variant:SNVIndel,adjustments:Record<string,unknown>,reason:string)=>{
    const saved=await saveResultRowAdjustment(taskId,table,variant.id,variant.adjustmentVersion??0,adjustments,reason);
    if(scopeRef.current!==taskId)return;
    const payload=saved.adjustment.adjustments;
    const svc=payload.svcv4Assessment as SNVIndel['svcv4Assessment'];
    const adopted=payload.adoptedACMG as SNVIndel['adoptedACMG'];
    const active=adopted?.version??(payload.activeAcmgVersion==='svcv4'?'svcv4':'legacy');
    setReloadToken(value=>value+1);
    setSelectedVariant(current=>current?.id!==variant.id?current:{...current,adoptedACMG:adopted,acmgSavedAt:payload.acmgSavedAt as string|undefined,svcv4SavedAt:payload.svcv4SavedAt as string|undefined,acmgEvidence:payload.acmgEvidence as SNVIndel['acmgEvidence'],acmgOverride:payload.acmgOverride as SNVIndel['acmgOverride'],acmgAIResult:payload.acmgAIResult as SNVIndel['acmgAIResult'],svcv4Assessment:svc,svcv4AIResult:payload.svcv4AIResult as SNVIndel['svcv4AIResult'],activeAcmgVersion:active,
      legacyAcmgClassification: (payload.acmgOverride || ('acmgEvidence' in payload ? payload.acmgClassification : current.automaticAcmg?.classification)) as ACMGClassification | undefined,
      acmgClassification:adopted?(adopted.automatic?current.automaticAcmg?.classification:adopted.classification):active==='svcv4'?svc?.result?.classification??undefined:(payload.acmgOverride || ('acmgEvidence' in payload ? payload.acmgClassification : current.automaticAcmg?.classification)) as ACMGClassification | undefined,
      acmgVusSubclass:active==='svcv4'?svc?.result?.vusSubclass??undefined:undefined,adjustmentVersion:saved.adjustment.version});
  },[taskId, table]);

  // 列定义
  const columns: Column<SNVIndel>[] = [
    {
      id: 'focused',
      header: <FocusColumnHeader />,
      accessor: (row) => {
        const state = getReviewState(row);
        return (
          <FocusCheckbox
            checked={state.focused}
            onChange={(checked) => handleFocusChange(row.id, checked, state)}
					disabled={pendingVariants.has(row.id) || !allowMarks || (supplemental && !permissions?.canFocus)}
          />
        );
      },
      width: 60,
      align: 'center',
    },
    {
      id: 'pinned',
      header: <PinColumnHeader />,
      accessor: (row) => {
        const state = getReviewState(row);
        return (
          <PinCheckbox
            reasons={row.pinReasons?.length?row.pinReasons:row.automaticAssessment?.pending}
            checked={state.pinned}
            source={reviewStatus[row.id] ? 'manual' : row.pinSource}
            onChange={(checked) => handlePinChange(row.id, checked, state)}
					disabled={pendingVariants.has(row.id) || !allowMarks || (supplemental && !permissions?.canReview)}
          />
        );
      },
      width: 60,
      align: 'center',
    },
    {
      id: 'gene',
      header: t("history.gene9ef2ed"),
      accessor: (row) => <GeneLinks genes={row.gene} annotationValues={row.annotationValues} />,
      width: 100,
      align: 'center',
      sortable: true,
    },
    {
      id: 'position',
      header: t("tasks.variantPosition9e0b4c"),
      accessor: (row) => row.chromosome && row.position > 0 ? (
        <PositionLink
          chromosome={row.chromosome}
          position={row.position}
          onClick={handleOpenIGV}
        />
      ) : '—',
      width: 150,
      align: 'center',
      sortable: true,
    },
    {
      id: 'change',
      header: t("tasks.referenceAlternateabcf6a"),
      accessor: (row) => <span className="block w-[116px] max-w-full whitespace-normal break-all text-center leading-5">{row.ref && row.alt ? row.ref + '>' + row.alt : '—'}</span>,
      width: 140,
      minWidth: 140,
      maxWidth: 140,
      align: 'center',
    },
    {
      id: 'variantType',
      header: t("history.variantType6c1aef"),
      accessor: (row) => {
        if (row.hotspotTargetOnly && !row.alt) return '—';
        const typeLabels = { SNV: 'SNV', Insertion: t("tasks.insertion022bf3"), Deletion: t("history.deletion2fe9b7"), Complex: t("tasks.complex2415d7") };
        return <VariantTypeBadge value={row.variantType}>{typeLabels[row.variantType]}</VariantTypeBadge>;
      },
      width: 80,
      align: 'center',
    },
    ...snvSampleColumns(family ?? Boolean(result?.columns?.some(field => /_(father|mother)$/.test(field)) || sortedData.some(row => row.father || row.mother)), t),
    {
      id: 'depth',
      header: t("tasks.deptha1128a"),
      accessor: (row) => Number.isFinite(row.depth) ? row.depth + 'X' : '—',
      width: 70,
      align: 'center',
      sortable: true,
    },
    {
      id: 'gnomadAF', header: t("tasks.gnomadOverallAf6abfe1"),
      accessor: row => formatPopulationFrequency(sourceAnnotation(row, 'GnomAD_AF', row.gnomadAF), t),
      width: 130, align: 'center', sortable: true,
    },
    {
      id: 'gnomadEasAF', header: t("tasks.gnomadEastAsianAfe9255d"),
      accessor: row => formatPopulationFrequency(sourceAnnotation(row, 'GnomAD_AF_EAS', row.gnomadEasAF), t),
      width: 130, align: 'center', sortable: true,
    },
    {
      id: 'clinvarSignificance', header: t("tasks.clinvarClinicalSignificance8d0200"),
      accessor: row => <ClinVarBadge value={sourceAnnotation(row, 'ClinVar_Sig', row.clinvarSignificance)} />,
      width: 240, minWidth: 200, maxWidth: 360, sortable: true,
    },
    {
      id: 'acmgClassification',
      header: t("tasks.acmgAssessment6a7cd5"),
      accessor: (row) => {
        const config = row.acmgClassification ? ACMG_CONFIG[row.acmgClassification] : undefined;
        const adopted = row.adoptedACMG?.source;
        const experimental = row.activeAcmgVersion === 'svcv4';
        const manual = adopted === 'manual' || adopted === 'manual_override' || adopted === 'manual_evidence' ||
          (!adopted && (row.acmgAssessmentSource === 'manual_override' || row.acmgAssessmentSource === 'manual_evidence'));
        const quick = adopted === 'quick' || ((!adopted || adopted === 'automatic') && row.acmgAssessmentSource === 'automatic' &&
          row.automaticAcmg?.classificationBasis && row.automaticAcmg.classificationBasis !== 'acmg_evidence');
        const source = experimental ? t("tasks.vExperimental7c90f7")
          : manual ? t('assessmentDisplay.manual')
          : adopted === 'database' ? t('assessmentDisplay.database')
          : adopted === 'ai' ? t('assessmentDisplay.ai')
          : quick ? t("tasks.quickAssessment6445dc") : t("tasks.currentEdition7b034e");
        const hint = experimental ? t("tasks.svcVDraftNonauthoritativeReferenceAssessment3fe575")
          : manual && row.acmgAssessmentSource === 'manual_override' ? t("tasks.manualClassificationOverride467829")
          : manual && row.acmgAssessmentSource === 'manual_evidence' ? t("tasks.calculatedFromSavedAcmgEvidence1b9d08")
          : (adopted && adopted !== 'automatic') || manual ? source
          : !config ? row.automaticAcmg?.pending?.map(item => t(item)).join(' · ') || t("tasks.insufficientEvidenceForAutomaticAssessmentef8b34")
          : quick ? t("tasks.quickAssessmentManualReview10d3bd") : t("tasks.automaticInitialAssessmentecbbfb");
        return <HoverHint content={hint}><span className="inline-flex flex-col items-center gap-1">
          {config
            ? <ClinicalSignificanceBadge value={row.acmgClassification}>{experimental && row.acmgVusSubclass ? row.acmgVusSubclass : config.label}</ClinicalSignificanceBadge>
            : <Tag variant="neutral" className="w-20 justify-center">{manual ? t('assessmentDisplay.notAssessed') : t("tasks.insufficientEvidence70568c")}</Tag>}
          {(config || adopted || manual) && <span className="text-xs text-fg-muted">{source}</span>}
        </span></HoverHint>;
      },
      width: 100,
      align: 'center',
      sortable: true,
    },
    {
      id: 'priorityScore',
      header: t('phenotype.priorityScore'),
      accessor: row => <HoverHint content={t('phenotype.priorityHelp')}><span className="inline-flex flex-col items-center gap-1"><span className="font-mono tabular-nums">{row.automaticAcmg?.priorityScore??'—'}<span className="text-fg-muted"> / 100</span></span>{row.automaticAcmg?.phenotypeMatch&&<span className="text-xs text-fg-muted">{row.automaticAcmg.phenotypeMatch.gene} · {(row.automaticAcmg.phenotypeMatch.score*100).toFixed(1)}%</span>}{row.automaticAcmg?.criteria?.length ? <span className="text-xs text-fg-muted">ACMG: {row.automaticAcmg.score}</span> : null}</span></HoverHint>,
      width: 140,
      align: 'center',
      sortable: true,
    },
    {
      id: 'transcript',
      header: t("history.transcript96b6d7"),
      accessor: 'transcript',
      width: 130,
      align: 'center',
    },
    {
      id: 'transcriptLocation',
      header: t("tasks.exonIntron580be3"),
      accessor: row => transcriptLocation(row).label,
      width: 130,
      align: 'center',
    },
    {
      id: 'hgvsc',
      header: 'HGVSc',
      accessor: row => <span className="block w-[110px] max-w-full whitespace-normal break-all text-center">{row.hgvsc}</span>,
      width: 110,
      align: 'center',
    },
    {
      id: 'hgvsp',
      header: 'HGVSp',
      accessor: row => <span className="block w-[110px] max-w-full whitespace-normal break-all text-center">{row.hgvsp}</span>,
      width: 110,
      align: 'center',
    },
  ];

  // 分页信息
  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <div data-density={tableView.density} className={`variant-tab-panel yj-interpretation-panel flex h-full min-h-0 flex-col overflow-hidden ${detailPanelOpen ? 'yj-has-inspector' : ''}`}>
      <div className="yj-variant-toolbar">
      <ParquetColumnFilterBar taskId={taskId} table={table} columns={localizeDisplay(result?.columns ?? [], t)} columnTypes={result?.columnTypes} columnLabels={resultColumnLabels(columns, result, 'snv-indel', t)} state={filterState} onChange={setFilterState} viewControls={<TableViewControls columns={localizeDisplay(columns, t)} view={tableView} />} />
      {/* 工具栏 */}
      <div className="yj-variant-controls-row">
        <div className="flex flex-wrap items-center gap-2">
          {/* 搜索框 */}
          <div className="w-52 shrink-0">
            <Input
              className="yj-variant-search [&_input]:min-w-0 [&_input]:w-0"
              placeholder={t("tasks.searchGeneOrPosition732ec5")}
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
              leftElement={<Search className="w-4 h-4" />}
            />
          </div>

          <ChromosomeFilter column={result?.columns?.find(field => field === 'Chromosome' || result.columnAliases?.[field]?.includes('chromosome'))} state={filterState} onChange={setFilterState} />

          {/* 基因列表筛选 */}
          <div className="relative">
            <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted pointer-events-none" />
            <select
              value={filterState.geneListId || ''}
              onChange={(e) => handleGeneListFilter(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm border border-border-default rounded-md bg-canvas-default text-fg-default min-w-[180px] appearance-none cursor-pointer"
            >
              <option value="">{t("tasks.allGenes2c428c")}</option>
              {geneLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.geneCount})
                </option>
              ))}
            </select>
          </div>

          <ActionButton action="refresh" iconOnly aria-label={t("tasks.refreshGeneLists40c56c")} variant="ghost" className="yj-tool-button shrink-0" type="button" onClick={async()=>{try{const lists=await getGeneLists();setGeneLists(lists);const selected=lists.find(x=>x.id===filterState.geneListId);if(filterState.geneListId&&!selected)throw new Error(t("tasks.selectedGeneListWasDeletedClearTheb1908d"));setFilterState({...filterState,geneListRevision:selected?.revision,page:1})}catch(e){setRequestError(e instanceof Error ? errorText(e, t):t("tasks.unableToLoadGeneListsa25a82"))}}}>{t("tasks.refreshGeneLists40c56c")}</ActionButton>

          {/* ACMG筛选 */}
          <select
            value={(filterState.filters.acmgClassification as string) || ''}
            onChange={(e) => handleACMGFilter(e.target.value as ACMGClassification | '')}
            className="px-3 py-1.5 text-sm border border-border-default rounded-md bg-canvas-default text-fg-default"
          >
            <option value="">{t("tasks.acmgAssessmentAll2ecd48")}</option>
            {Object.entries(ACMG_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{translateUI(config.label, t)}</option>
            ))}
          </select>
        </div>

        {/* 统计信息 */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
          {selectedGeneList && (
            <span className="text-accent-fg">
              {t("tasks.filtered27ef08")}{selectedGeneList.name}
            </span>
          )}
      <span>{t("history.total497064")}{result?.total ?? 0} {supplemental ? t("oncologyResults." + table) : t("tasks.snpIndelVariants5dd28f")}</span>
        </div>
      </div>
      </div>

      {/* 数据表格 */}
		{operationError && <div role="alert" className="mb-3 rounded-lg border border-danger-emphasis bg-danger-subtle p-3 text-sm text-danger-fg">{operationError}</div>}
		{requestError && !loading ? (
			<div className="rounded-lg border border-danger-emphasis bg-danger-subtle p-4 text-sm text-danger-fg">{requestError}</div>
		) : loading && !result ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-emphasis" />
        </div>
        ) : result ? (
        <>
          {supplemental && result.total === 0 && <p role="status" className="py-3 text-sm text-fg-muted">{t(filterState.searchQuery || filterState.columnFilters?.length || Object.keys(filterState.filters).length || filterState.geneListId ? 'oncologyResults.noMatches' : 'oncologyResults.noRows')}</p>}
          <DataTable
            className="variant-results-table min-h-0 flex-1"
            stickyHeader
            data={sortedData}
            columns={localizeDisplay(filterableColumns(tableView.apply(columns), result, filterState, setFilterState, 'snv-indel', t), t)}
            rowKey="id"
            striped
            density={tableView.density}
            sortColumn={filterState.sortColumn}
            sortDirection={filterState.sortDirection}
            onSortChange={handleSortChange}
            selectedRows={new Set(detailPanelOpen && selectedVariant ? [selectedVariant.id] : [])}
            onRowClick={handleRowClick}
          />

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 mt-2">
              <div className="text-sm text-fg-muted">
                {t("history.pagef49534")}{filterState.page} / {totalPages} {t("history.labelaf8438")}</div>
              <div className="flex items-center gap-2">
                <ActionButton variant="ghost"
                  onClick={() => setFilterState({ ...filterState, page: filterState.page - 1 })}
                  disabled={filterState.page <= 1}
                  className="yj-tool-button"
                >
                  {t("history.previousb41561")}</ActionButton>
                <ActionButton variant="ghost"
                  onClick={() => setFilterState({ ...filterState, page: filterState.page + 1 })}
                  disabled={filterState.page >= totalPages}
                  className="yj-tool-button"
                >
                  {t("history.next67a246")}</ActionButton>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-fg-muted">
          {t("tasks.noSnpIndelVariantData798100")}</div>
      )}

      {/* IGV 查看器 */}
      <IGVViewer
		taskId={taskId}
        chromosome={igvState.chromosome}
        position={igvState.position}
        isOpen={igvState.isOpen}
        onClose={handleCloseIGV}
      />

      {/* 变异详情面板 */}
      <VariantDetailPanel
        taskId={taskId}
        table={table}
        onNavigate={onNavigate}
        referenceGenome={referenceGenome}
        variant={selectedVariant}
        isOpen={detailPanelOpen}
        onClose={handleCloseDetailPanel}
        onUpdateClassification={selectedVariant?.hotspotTargetOnly ? undefined : handleUpdateClassification}
        onSaveInterpretation={selectedVariant?.hotspotTargetOnly ? undefined : handleSaveInterpretation}
        onSaveVersionedAssessment={selectedVariant?.hotspotTargetOnly ? undefined : handleSaveVersionedAssessment}
      />
    </div>
  );
}
