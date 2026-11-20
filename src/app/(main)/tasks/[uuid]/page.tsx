'use client';
import {TrioSnapshot} from '@/components/shared/TrioSummary';
import { errorText } from '@/i18n/errors';

import { useText } from '@/i18n/useText';


import { canInterpretTask, isTaskResultPreparing, isTaskResultImportFailed } from '@/lib/task-interpretation';
import { IconActionButton } from '@/components/shared/ActionButton';


import * as React from 'react';
import { InterpretationReadOnlyContext } from './components/InterpretationLock';
import { useParams, useRouter } from 'next/navigation';
import { PageContent } from '@/components/layout';
import { tasksApi } from '@/lib/tasks';
import { TaskRuntimeTab } from './components/TaskRuntimeTab';
import {AssessmentStatusBar} from './components/AssessmentStatusBar';
import { getOncologyTabs, isOncologyResultTab, isPairedOncologyTask, isRnaFusionTask, type SNVResultLocus } from './oncology-results';
import { ChemotherapyResultView } from './components/ChemotherapyResultView';
import { OncologyResultView } from './components/OncologyResultView';
import { useTabState } from './hooks/useTabState';
import { useVariantPreload } from './hooks/useVariantPreload';
import { getResultContext, clearTaskRowSnapshots } from './result-api';
import { clearTaskBrowserResults } from '@/lib/parquet-browser';
import { getRuntimeBackendFlavor } from '@/lib/runtime-config';
import { useResearchExpiry } from '@/lib/research-retention';
import type { AnalysisTaskDetail, ResultContext, TabType } from './types';
import type { SampleDetail } from '@/app/(main)/samples/types';
import {
  TaskHeader,
  ResultTabs,
  SampleSummaryCard,
  SNVIndelTab,
  CNVSegmentTab,
  CNVExonTab,
  STRTab,
  MEITab,
  MTTab,
  UPDTab,
  ROHTab,
  FilesTab,
	ResultOverview,
	VariantTypeNav,
} from './components';

export default function AnalysisDetailPage() {
  const t = useText();
  const params = useParams();
  const router = useRouter();

  const uuid = params.uuid as string;
  const [completionSaving, setCompletionSaving] = React.useState(false);
  const [completionError, setCompletionError] = React.useState('');
  const completionRevisionRef = React.useRef(0);
  const completionPendingRef = React.useRef(false);
  const [assessmentRevision,setAssessmentRevision]=React.useState(0);
 React.useEffect(()=>{const changed=(event:Event)=>{if((event as CustomEvent).detail?.taskId===uuid)setAssessmentRevision(x=>x+1);};window.addEventListener("zhiji:assessment-reloaded",changed);return()=>window.removeEventListener("zhiji:assessment-reloaded",changed);},[uuid]);

  const [task, setTask] = React.useState<AnalysisTaskDetail | null>(null);
  const [sample, setSample] = React.useState<SampleDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
	const [resultContext, setResultContext] = React.useState<ResultContext | null>(null);
	const [resultContextError, setResultContextError] = React.useState<string | null>(null);


 React.useEffect(()=>{
  if(getRuntimeBackendFlavor()!=='onykia'||!task?.expiresAt)return;
  let timer:ReturnType<typeof setTimeout>;
  const check=()=>{
   clearTimeout(timer);
   const left=Date.parse(task.expiresAt!)-Date.now();
   if(!Number.isFinite(left))return;
   if(left<=0){clearTaskRowSnapshots(uuid);void clearTaskBrowserResults(uuid);setTask(null);setSample(null);setResultContext(null);router.replace('/tasks');return;}
   timer=setTimeout(check,Math.min(left,60_000));
  };
  check();window.addEventListener('focus',check);
  return()=>{clearTimeout(timer);window.removeEventListener('focus',check);};
 },[task?.expiresAt,uuid,router]);
  useResearchExpiry(sample?.expiresAt,()=>setSample(null));
  // 使用标签页状态管理hook，默认从质控结果开始
	const { activeTab, activeRow, hasExplicitTab, setActiveTab, getFilterState, setFilterState } = useTabState(uuid);
	useVariantPreload(uuid, resultContext, !loading && !!task && canInterpretTask(task)
		&& ['completed', 'pending_interpretation'].includes(task.status) && activeTab === 'overview');
	const oncologyTabs = React.useMemo(() => task ? getOncologyTabs(task, resultContext) : undefined, [task, resultContext]);
	const defaultVariantTab = oncologyTabs?.[0]?.id ?? 'snv-indel';
	const manuallySelectedTabRef = React.useRef(false);
	const automaticallySelectedTabRef = React.useRef<TabType | null>(null);
	const handleTabChange = React.useCallback((tab: TabType, rowId?: string, locus?: SNVResultLocus) => {
		manuallySelectedTabRef.current = true;
		automaticallySelectedTabRef.current = null;
		setActiveTab(tab, rowId, locus);
	}, [setActiveTab]);

  // 加载任务数据和样本数据
  React.useEffect(() => {
		const controller = new AbortController();
    async function loadData() {
      setLoading(true);
      setNotFound(false);
      try {
        const taskData = await tasksApi.get(uuid);
        if (controller.signal.aborted) return;
        if (!['completed', 'pending_interpretation'].includes(taskData.status) || !canInterpretTask(taskData)) {
          setTask(taskData); setSample(null); setResultContext(null); return;
        }
        const [sampleData, contextData] = await Promise.all([
          tasksApi.getSample(uuid).catch(() => null),
			getResultContext(uuid, controller.signal).catch(cause => {
				if (!controller.signal.aborted) setResultContextError(cause instanceof Error ? errorText(cause, t) : t("tasks.unableToReadResultContext16d461"));
				return null;
			}),
        ]);
		if (controller.signal.aborted) return;
        setTask(taskData);
        setSample(sampleData);
		setResultContext(contextData);
      } catch {
        setNotFound(true);
        setTask(null);
        setSample(null);
      } finally {
        setLoading(false);
      }
    }
		void loadData();
		return () => controller.abort();
  }, [uuid]);

	React.useEffect(() => {
		if (loading || !task || !['completed', 'pending_interpretation'].includes(task.status) || !canInterpretTask(task)) return;
		let disposed = false;
		let requestInFlight = false;
		const refreshContext = async () => {
			if (requestInFlight) return;
			requestInFlight = true;
			try {
				const next = await getResultContext(uuid);
				if (disposed) return;
				setResultContext(next);
				setResultContextError(null);
			} catch (cause) {
				if (!disposed) setResultContextError(cause instanceof Error ? errorText(cause, t) : t("tasks.unableToReadResultContext16d461"));
			} finally {
				requestInFlight = false;
			}
		};
		const timer = window.setInterval(() => void refreshContext(), resultContext?.state==='ready'?30000:5000);
		return () => {
			disposed = true;
			window.clearInterval(timer);
		};
	}, [loading, task?.id, task?.template, resultContext?.state, uuid]);

	React.useEffect(() => {
		const controller = new AbortController();
		let refreshing=false;
		const refreshAfterAdjustment = () => {
			if(refreshing)return;refreshing=true;
			void getResultContext(uuid, controller.signal).then(next => {
				setResultContext(next);
				setResultContextError(null);
			}).catch(cause => {
				if (!controller.signal.aborted) setResultContextError(cause instanceof Error ? errorText(cause, t) : t("tasks.unableToRefreshResultStatistics149dd2"));
			}).finally(()=>{refreshing=false;});
		};
		window.addEventListener('zhiji:result-adjustment-saved', refreshAfterAdjustment);
		const onSynced=(event:Event)=>{if((event as CustomEvent).detail?.taskId===uuid)refreshAfterAdjustment();};
		window.addEventListener('zhiji:result-overlays-synced',onSynced);
		return () => {
			controller.abort();
			window.removeEventListener('zhiji:result-adjustment-saved', refreshAfterAdjustment);
			window.removeEventListener('zhiji:result-overlays-synced',onSynced);
		};
	}, [uuid]);

	React.useEffect(() => {
		if (loading || manuallySelectedTabRef.current) return;
		if (hasExplicitTab && automaticallySelectedTabRef.current === null) return;
		const nextTab: TabType = task && isRnaFusionTask(task) && resultContext?.oncology?.fusion ? 'fusion' : 'overview';
		if (activeTab === nextTab) {
			automaticallySelectedTabRef.current = nextTab;
			return;
		}
		automaticallySelectedTabRef.current = nextTab;
		setActiveTab(nextTab);
	}, [activeTab, hasExplicitTab, loading, resultContext?.oncology?.fusion, setActiveTab, task]);

  // 返回任务列表
  const handleBack = React.useCallback(() => {
    router.push('/tasks');
  }, [router]);

  const setInterpretationCompleted = async () => {
    if (!task || completionSaving) return;
    completionPendingRef.current = true;
    completionRevisionRef.current += 1;
    setCompletionSaving(true); setCompletionError('');
    try {
      const next = await tasksApi.setInterpretationCompleted(uuid, !task.interpretationCompletedAt, task.attemptId || uuid);
      setTask(next);
    } catch (cause) { setCompletionError(cause instanceof Error ? errorText(cause, t) : t("tasks.unableToUpdateInterpretationStatus664ece")); }
    finally { completionPendingRef.current = false; setCompletionSaving(false); }
  };
  React.useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (completionPendingRef.current) return;
      const revision = completionRevisionRef.current;
      void tasksApi.get(uuid).then(next => {
        if (!controller.signal.aborted && !completionPendingRef.current && revision === completionRevisionRef.current) setTask(next);
      }).catch(() => {});
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [uuid]);

  React.useEffect(() => {
    if (loading || activeTab === 'overview' || activeTab === 'files') return;
    if (oncologyTabs && !oncologyTabs.some(tab => tab.id === activeTab)) {
      setActiveTab(oncologyTabs[0]?.id ?? 'overview');
    } else if (!oncologyTabs && isOncologyResultTab(activeTab)) {
      setActiveTab('snv-indel');
    }
  }, [activeTab, loading, oncologyTabs, setActiveTab]);
  React.useEffect(() => {
    if (!task || (!['waiting_for_data', 'queued', 'running'].includes(task.status) && !isTaskResultPreparing(task) && !isTaskResultImportFailed(task))) return;
    let disposed = false, pending = false;
    const timer = window.setInterval(async () => {
      if (pending) return; pending = true;
      try {
        const next = await tasksApi.get(uuid);
        if (disposed) return;
        if (['completed', 'pending_interpretation'].includes(next.status) && canInterpretTask(next)) {
          const [sampleData, contextData] = await Promise.all([tasksApi.getSample(uuid).catch(() => null), getResultContext(uuid)]);
          if (disposed) return;
          setSample(sampleData); setResultContext(contextData);
        }
        setTask(next);
      } catch { /* Keep the preparation notice during a transient outage. */ }
      finally { pending = false; }
    }, 5000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [uuid, task?.status, task?.resultImportStatus]);
  // 404页面
  if (notFound) {
    return (
      <PageContent>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-2xl font-semibold text-fg-default mb-2">404</h2>
          <p className="text-fg-muted mb-4">{t("tasks.analysisTaskNotFoundc133f8")}</p>
          <button
            onClick={handleBack}
            className="text-accent-fg hover:underline"
          >
            {t("tasks.backToTaskListcd3b22")}</button>
        </div>
      </PageContent>
    );
  }

  // 加载中
  if (loading) {
    return (
      <PageContent>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-emphasis" />
        </div>
      </PageContent>
    );
  }

  if (!task) {
    return null;
  }

  if (!['completed', 'pending_interpretation'].includes(task.status) || !canInterpretTask(task)) return <PageContent>
    <TaskHeader task={task} onBack={handleBack} />
    <TaskRuntimeTab taskId={uuid} initialStatus={task.status} onResultImportChange={async () => { setTask(await tasksApi.get(uuid)); }} />
  </PageContent>;

  // 渲染当前标签页内容
  const renderTabContent = () => {
    if (oncologyTabs?.some(tab => tab.id === activeTab) && (activeTab === 'germline' || activeTab === 'hotspot')) {
      const table = activeTab;
      const summary = resultContext?.oncology?.[table];
      if (summary?.state !== 'ready') {
        const state = summary?.state ?? (resultContext?.state === 'importing' ? 'pending' : 'unavailable');
        return <p role="status" className="p-6 text-sm text-fg-muted">{t('oncologyResults.' + state)}</p>;
      }
      return <SNVIndelTab key={table} taskId={uuid} linkedVariantId={activeRow} table={table}
        permissions={resultContext?.permissions} onNavigate={handleTabChange} family={false}
        referenceGenome={resultContext?.reference.declaredId}
        filterState={getFilterState(table)} onFilterChange={state => setFilterState(table, state)} />;
    }
    if (oncologyTabs?.some(tab => tab.id === activeTab) && activeTab === 'chemotherapy') {
      return <ChemotherapyResultView key={uuid + ':' + (activeRow ?? '')} taskId={uuid} activeRow={activeRow}
        summary={resultContext?.oncology?.chemotherapy} referenceGenome={resultContext?.reference.declaredId}
        clearActiveRow={() => handleTabChange('chemotherapy')} />;
    }
    if (oncologyTabs?.some(tab => tab.id === activeTab) && isOncologyResultTab(activeTab)) {
      return <OncologyResultView key={activeTab + ':' + (activeRow ?? '')} taskId={uuid} tab={activeTab}
        summary={resultContext?.oncology?.[activeTab] ?? (resultContext?.state === 'importing' ? { state: 'pending' } : undefined)}
        activeRow={activeRow} referenceGenome={resultContext?.reference.declaredId} permissions={resultContext?.permissions} tabs={oncologyTabs} onNavigate={handleTabChange} />;
    }
    if (oncologyTabs && activeTab !== 'overview' && activeTab !== 'files' &&
      !oncologyTabs.some(tab => tab.id === activeTab)) return null;
    if (activeTab !== 'overview' && activeTab !== 'files' && resultContext?.state === 'ready' && resultContext.parquet?.available && !resultContext.parquet.tables.includes(activeTab)) {
      return <div className="flex h-full items-center justify-center p-8 text-sm text-fg-muted">{t('history.notProvided071fb2')}</div>;
    }
    switch (activeTab) {
		case 'overview':
			return resultContext ? <ResultOverview context={resultContext} sample={sample} snapshot={task.trioMembers} oncologyTabs={oncologyTabs} paired={isPairedOncologyTask(task, resultContext)} onNavigate={handleTabChange} /> : <ResultContextUnavailable message={resultContextError} />;
      case 'snv-indel':
        return (
          <SNVIndelTab
            taskId={uuid}
            linkedVariantId={activeRow}
            family={task.template ? task.template === 'trio' || Boolean(task.trioMembers?.length) : undefined}
            referenceGenome={resultContext?.reference.declaredId}
            filterState={getFilterState('snv-indel')}
            onFilterChange={(state) => setFilterState('snv-indel', state)}
          />
        );
      case 'cnv-segment':
        return (
          <CNVSegmentTab
            taskId={uuid}
            referenceId={resultContext?.reference.declaredId}
            filterState={getFilterState('cnv-segment')}
            onFilterChange={(state) => setFilterState('cnv-segment', state)}
          />
        );
      case 'cnv-exon':
        return (
          <CNVExonTab
            taskId={uuid}
            referenceId={resultContext?.reference.declaredId}
            filterState={getFilterState('cnv-exon')}
            onFilterChange={(state) => setFilterState('cnv-exon', state)}
          />
        );
      case 'str':
        return (
          <STRTab
            taskId={uuid}
            filterState={getFilterState('str')}
            onFilterChange={(state) => setFilterState('str', state)}
          />
        );
      case 'mei':
        return (
          <MEITab
            taskId={uuid}
            filterState={getFilterState('mei')}
            onFilterChange={(state) => setFilterState('mei', state)}
          />
        );
      case 'mt':
        return (
          <MTTab
            taskId={uuid}
            filterState={getFilterState('mt')}
            onFilterChange={(state) => setFilterState('mt', state)}
          />
        );
      case 'upd':
        return (
          <UPDTab
            taskId={uuid}
            filterState={getFilterState('upd')}
            onFilterChange={(state) => setFilterState('upd', state)}
          />
        );
      case 'roh':
        return (
          <ROHTab
            taskId={uuid}
            filterState={getFilterState('roh')}
            onFilterChange={(state) => setFilterState('roh', state)}
          />
        );
      case 'files':
        return <FilesTab taskId={uuid} template={task.template} />;
      default:
        return null;
    }
  };

	 const resultContextKey = [assessmentRevision,
		uuid,
		resultContext?.executionAttemptId ?? 'no-attempt',
		resultContext?.importBatchId ?? 'no-batch',
		resultContext?.version ?? 'no-version',
	].join(':');
	const usesOncologyTable = isOncologyResultTab(activeTab);
	const isVariantTab = usesOncologyTable || ['snv-indel', 'cnv-segment', 'cnv-exon', 'str', 'mei', 'mt', 'upd', 'roh'].includes(activeTab);

  return (
    <InterpretationReadOnlyContext.Provider value={!!task.interpretationCompletedAt || completionSaving}>
    <PageContent padded={false} className="h-full min-h-0 !overflow-hidden flex flex-col">
      <div className="shrink-0 border-b border-border-subtle bg-canvas-default px-3 pt-2 md:px-4">
      {/* 任务信息头部 */}
      <TaskHeader task={task} onBack={handleBack} compact completionControl={(['completed', 'pending_interpretation'].includes(task.status) || task.interpretationCompletedAt) && <IconActionButton label={t(task.interpretationCompletedAt ? "uploadExperience.interpretationDone" : "uploadExperience.interpretationOpen")} action={task.interpretationCompletedAt ? 'lock' : 'unlock'} loading={completionSaving} variant="ghost" type="button" className="yj-tool-button" disabled={completionSaving} onClick={() => void setInterpretationCompleted()} />} />
      {task.interpretationCompletedAt && <p role="status" className="mb-2 rounded bg-canvas-subtle px-3 py-2 text-xs text-fg-muted">{t("tasks.interpretationIsCompleteAndReadOnlyReopen89d694")}</p>}
      {completionError && <p role="alert" className="mb-2 text-sm text-danger-fg">{completionError}</p>}
      {!oncologyTabs && !!task.trioMembers?.length && <TrioSnapshot members={task.trioMembers}/>}
      {!sample && task.sampleId && <aside role="note" className="mb-4 rounded-lg border border-border-default p-4 text-sm text-fg-muted">{t("research.missingSample")}</aside>}
      {oncologyTabs ? <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-md bg-canvas-subtle px-3 py-2 text-xs text-fg-muted">
        <span>{t(isPairedOncologyTask(task, resultContext) ? 'oncologyResults.tumorSample' : 'oncologyResults.sample')} <strong className="font-medium text-fg-default">{task.internalId || sample?.internalId || '—'}</strong></span>
        {isPairedOncologyTask(task, resultContext) && <span>{t('oncologyResults.normalSample')} <strong className="font-medium text-fg-default">{task.normalSampleInternalId || resultContext?.members?.find(member => member.role === 'normal')?.internalId || task.normalSampleId || resultContext?.members?.find(member => member.role === 'normal')?.sampleId || '—'}</strong></span>}
        <span>{t('oncologyResults.cancer')} <strong className="font-medium text-fg-default">{sample?.cancerType || '—'}</strong></span>
        <span>{t('oncologyResults.reference')} <strong className="font-medium text-fg-default">{resultContext?.reference.declaredId || '—'}</strong></span>
      </div> : sample && <SampleSummaryCard key={sample.id} sample={sample} onSampleChange={setSample} />}

      </div>
      <div className="min-h-0 flex-1 flex flex-col overflow-hidden px-3 pb-3 md:px-4 md:pb-4">

      {/* 标签面板和内容 */}
		<div className="flex-1 min-h-0"><ResultTabs activeTab={activeTab} onTabChange={handleTabChange} defaultVariantTab={defaultVariantTab} showVariants={oncologyTabs?.length !== 0} compactOnNarrow={Boolean(oncologyTabs)} variantNavigation={isVariantTab && <VariantTypeNav activeTab={activeTab} context={resultContext} tabs={oncologyTabs} snvOnly={task?.resultCapabilities?.includes('snv_indel') && !task.resultCapabilities.includes('qc')} onTabChange={handleTabChange} />} tools={!usesOncologyTable && (!oncologyTabs || activeTab === 'snv-indel') && <AssessmentStatusBar taskId={uuid} table={isVariantTab ? activeTab : undefined} />}>
			{isVariantTab ? (
				<div key={resultContextKey} className="yj-result-workspace">
					<div className="yj-result-content">{renderTabContent()}</div>
				</div>
			) : <div key={resultContextKey} className={activeTab === 'overview' && oncologyTabs ? "h-full overflow-auto bg-canvas-subtle" : "h-full overflow-auto"}>{renderTabContent()}</div>}
		</ResultTabs></div>
      </div>
    </PageContent>
    </InterpretationReadOnlyContext.Provider>
  );
}

function ResultContextUnavailable({ message }: { message: string | null }) {
  const t = useText();
  return (
    <div className="rounded-xl border border-border-default bg-canvas-default p-8 text-center">
      <h2 className="font-semibold text-fg-default">{t("tasks.resultContextUnavailablefd880e")}</h2>
      <p className="mt-2 text-sm text-fg-muted">{message || t("tasks.structuredImportOfTaskResultsIsIncomplete9ca7c6")}</p>
    </div>
  );
}
