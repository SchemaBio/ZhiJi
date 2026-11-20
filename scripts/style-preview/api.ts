import { previewAssets, previewSamples, previewTasks, previewTaskCounts, previewPipelineVersion, findPreviewTaskFixture, type PreviewSample } from './oncology-fixtures';
import { oncologyPipelines } from '../../src/lib/oncology-pipelines';

const pedigreeFixture = {id:'preview-family',name:'FAM-示例',disease:'合成家系 · 用于布局检查',note:'不含真实患者资料',proband_member_id:'child',updated_at:'2026-10-08T09:00:00Z',members:[{id:'father',name:'父亲',gender:'male',relation:'father',affected_status:'unaffected',generation:0,position:0},{id:'mother',name:'母亲',gender:'female',relation:'mother',affected_status:'unaffected',generation:0,position:1},{id:'child',name:'先证者',gender:'male',relation:'proband',affected_status:'affected',generation:1,position:0,father_id:'father',mother_id:'mother',phenotypes:['合成表型']} ]};
const sampleStorageKey = 'zhiji-preview-oncology-samples';
export function readPreviewSamples(): PreviewSample[] {
  const stored = sessionStorage.getItem(sampleStorageKey);
  if (!stored) return previewSamples;
  const saved = JSON.parse(stored) as PreviewSample[];
  const knownIds = new Set(previewSamples.map(sample => sample.id));
  const edited = new Map(saved.filter(sample => sample.created_at !== sample.updated_at).map(sample => [sample.id, sample]));
  return [...saved.filter(sample => !knownIds.has(sample.id)), ...previewSamples.map(sample => edited.get(sample.id) ?? sample)];
}

function savePreviewSample(body: Partial<PreviewSample>, id?: string) {
  const records = readPreviewSamples();
  const current = id ? records.find(record => record.id === id) : undefined;
  if (id && !current) throw new ApiError('找不到合成样本', 404);
  if (records.some(record => record.id !== id && record.internal_id === body.internal_id)) {
    throw new ApiError('样本内部编号已存在', 409);
  }
  const now = new Date().toISOString();
  const sample = {
    ...current, ...body, id: id ?? `detail-preview-${crypto.randomUUID()}`,
    matched_pair: current?.matched_pair ?? null, created_at: current?.created_at ?? now, updated_at: now,
  };
  const next = id ? records.map(record => record.id === id ? sample : record) : [sample, ...records];
  sessionStorage.setItem(sampleStorageKey, JSON.stringify(next));
  return sample;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status = 500) { super(message); }
}

export function apiResourceURL(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`/api${endpoint}`, location.origin);
  url.search = new URLSearchParams(params).toString();
  return url.href;
}
const viewsByTable = new Map<string, any[]>();
function previewViews(url: string) {
  if (!viewsByTable.has(url)) viewsByTable.set(url, []);
  return viewsByTable.get(url)!;
}
function previewPage<T>(items: T[], params: { page?: string; page_size?: string } = {}) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Number(params.page_size) || 100);
  const offset = (page - 1) * pageSize;
  return { items: items.slice(offset, offset + pageSize), total: items.length, page, page_size: pageSize, total_pages: Math.ceil(items.length / pageSize) };
}
let reportReadFails = false;
export const previewReportFailure = () => { reportReadFails = true; };
const pageReadFailures = new Set<string>();
const initialFailure = new URLSearchParams(location.search).get('previewFailure');
if (initialFailure) pageReadFailures.add(initialFailure);
export const previewPageFailure = (scope: 'dashboard' | 'billing' | 'pedigree' | 'data') => { pageReadFailures.add(scope); };
const transactions = ['recharge','pre_deduction','deduction','refund','failure_refund','adjust','download'].map((type,i)=>({id:i+1,type,org_id:'preview',amount:[1000,-75,-20,55,75,10,-1][i],balance_after:1000,description:'合成账单 · 仅用于界面预览',created_by:1,created_at:'2026-10-08T09:00:00Z'}));
export const api = {
  get: async (url: string, options?: any) => {
    for(const [scope,suffix] of [['dashboard','/dashboard/stats'],['billing','/billing/transactions'],['task-options','/v1/pipelines'],['config','/v1/pipelines'],['baseline','/v1/cnv-baselines'],['report-history','/report-generations'],['templates','/v1/report-templates'],['recharge','/billing/config'],['permissions','/v1/users'],['admin','/v1/admin/stats'],['samples','/v1/samples'],['gene-list','/v1/gene-lists']]) {
      if(url.endsWith(suffix) && pageReadFailures.has(scope)) {
        pageReadFailures.delete(scope);
        throw new Error('合成预览：页面数据读取失败');
      }
    }
    if(url.endsWith('/v1/gene-lists')) return [{id:'synthetic-genes',name:'合成肿瘤候选基因',disease_category:'肿瘤研究',description:'仅用于界面检查',genes:['BRCA1','EGFR','TP53'],category:'important',scope:'personal',can_maintain:true,revision:1,created_at:'2026-10-08T09:00:00Z',updated_at:'2026-10-08T09:00:00Z'}];
    if(url.endsWith('/v1/data/config')) return {provider:'s3',retention_days:7,temporary:true,download_allowed:false,max_file_size_bytes:100_000_000_000};
    if(url.endsWith('/v1/upload/files/stats')) return {total:previewAssets.length,total_bytes:previewAssets.reduce((bytes, asset) => bytes + asset.file_size, 0),reserved_bytes:0};
    if(url.endsWith('/report-generations')) return ['ready','failed','pending'].map((state,i)=>({id:'synthetic-report-'+i,state,createdAt:'2026-10-08T09:00:00Z',errorCode:state==='failed'?'SYNTHETIC_TIMEOUT':'',contractVersion:'report-snapshot-v2'}));
    if(url.endsWith('/downloads/active')) return [{id:'synthetic-quote',kind:'bam',filename:'DEMO-合成样本.bam',size_bytes:1_000_000_000,credits:1,charged_at:'2026-10-08T09:00:00Z',expires_at:'2026-10-10T00:00:00Z'}];
    if(url.endsWith('/downloads')) return {attempt_id:'preview-attempt',zip_status:'ready',zip:{id:'synthetic-zip',filename:'DEMO-合成结果.zip',size_bytes:1000000,credits:1},bams:[{id:'synthetic-bam',filename:'DEMO-合成样本.bam',size_bytes:1_000_000_000,credits:1,role:'proband'}],missing:['mt_vcf'],bam_status:'available'};
    if(url.endsWith('/v1/report-templates') && reportReadFails) { reportReadFails=false; throw new Error('合成预览：报告服务读取失败'); }
    if (url.endsWith('/v1/samples')) {
      const search = String(options?.params?.search ?? '').trim().toLowerCase();
      const samples = readPreviewSamples().filter(sample => `${sample.id} ${sample.internal_id}`.toLowerCase().includes(search));
      return previewPage(samples, options?.params);
    }
    const sampleRoute = /^\/v1\/samples\/([^/]+)(\/data-link)?$/.exec(url);
    if (sampleRoute) {
      const sample = readPreviewSamples().find(item => item.id === decodeURIComponent(sampleRoute[1]));
      if (!sample) throw new ApiError('找不到合成样本', 404);
      if (sampleRoute[2]) {
        const linked = previewAssets.filter(asset => asset.internal_id === sample.internal_id);
        const read1 = linked.find(asset => asset.read_type === 'read1') ?? null;
        const read2 = linked.find(asset => asset.read_type === 'read2') ?? null;
        return { read1, read2, unavailable: !!sample.matched_pair && (!read1 || !read2) };
      }
      const analysisTasks = previewTasks.filter(task => {
        const fixture = findPreviewTaskFixture(task.id);
        return fixture?.sample.id === sample.id || fixture?.normalSample?.id === sample.id;
      }).map(task => ({ id: task.id, name: task.name, status: task.status, created_at: task.createdAt }));
      return { ...sample, analysis_tasks: analysisTasks };
    }
    if(url.endsWith('/v1/pedigrees')) return [pedigreeFixture];
    if(url.endsWith('/v1/pedigrees/preview-family')) { if(pageReadFailures.delete('pedigree')) throw new Error('合成预览：家系详情读取失败'); return pedigreeFixture; }
    if(url.endsWith('/v1/report-templates')) return [{id:'preview-report',name:'合成肿瘤报告',description:'用于界面检查的报告服务',apiEndpoint:'https://example.invalid/reports/generate',hasApiKey:true,isActive:true,canMaintain:true,revision:1,contractVersion:'report-snapshot-v2',updatedAt:'2026-10-08T09:00:00Z'}];
    if(url.endsWith('/v1/users/pending')) return [{id:'preview-pending',name:'待审批示例',email:'pending@example.invalid',org_id:'preview-org',system_role:'ORG_USER',approval_status:'pending',is_active:false,created_at:'2026-10-08T09:00:00Z'}];
    if(url.endsWith('/v1/users')) return {items:[{id:'preview-user',name:'示例用户',email:'user@example.invalid',org_id:'preview-org',system_role:'ORG_USER',approval_status:'approved',is_active:true,created_at:'2026-10-08T09:00:00Z'}],total:1,total_pages:1};
    if(url.endsWith('/v1/admin/orgs')) return [{id:'preview-org',name:'示例实验室',slug:'preview-lab',max_concurrent_tasks:5,balance_alert_threshold:100,storage_quota_bytes:30*1024**3,is_active:true}];
    if(url.endsWith('/v1/admin/stats')) return {organizations:{total:1,active:1,suspended:0},tasks:{running:1,completed:3,failed:1,today_created:3,today_finished:2},credits:{total_consumed_today:42,total_consumed_month:120,total_recharged_today:0,total_recharged_month:1000,orgs_low_balance:0},top_orgs:[{org_id:'preview-org',org_name:'示例实验室',balance:1000,task_count:5,credits_used_today:42}],recent_tasks:previewTasks.slice(0, 4).map(task => ({ id: task.id, name: task.name, org_name: '示例实验室', status: task.status, created_at: task.createdAt }))};
    if (url.endsWith('/v1/data/assets')) {
      if (pageReadFailures.delete('data')) throw new Error('合成预览：数据读取失败');
      const { read_type, status, reference_genome, search = '' } = options?.params ?? {};
      const query = String(search).trim().toLowerCase();
      const items = previewAssets.filter(asset =>
        (!read_type || asset.read_type === read_type) && (!status || asset.status === status) &&
        (!reference_genome || asset.reference_genome === reference_genome) &&
        `${asset.file_name} ${asset.internal_id ?? ''}`.toLowerCase().includes(query),
      );
      return previewPage(items, options?.params);
    }
    if (url.endsWith('/v1/pipelines')) return {
      items: oncologyPipelines.map(workflow => ({
        id: workflow.id, base_pipeline_id: workflow.id, name: workflow.id, base_type: workflow.kind,
        template: workflow.template, version: previewPipelineVersion, reference_genome: workflow.genome,
        is_builtin: true, status: 'active', resource_available: true,
      })),
      total: oncologyPipelines.length,
    };
    if(url.endsWith('/views')) return previewViews(url);
    if (url.endsWith('/dashboard/stats')) return {
      totalSamples: readPreviewSamples().length,
      pendingTasks: (previewTaskCounts.queued ?? 0) + (previewTaskCounts.waiting_for_data ?? 0),
      waitingDataTasks: previewTaskCounts.waiting_for_data ?? 0,
      runningTasks: previewTaskCounts.running ?? 0,
      completedTasks: previewTaskCounts.completed ?? 0,
      failedTasks: previewTaskCounts.failed ?? 0,
    };
    if(url.endsWith('/v1/announcements')) return {items:[],server_time:new Date().toISOString(),org_id:'preview-org'};
    if(url.endsWith('/billing/balance')) return {org_id:'preview',balance:1000};
    if(url.endsWith('/billing/config') || url.endsWith('/billing/effective-config')) return {credits_per_minute:1,credit_rate_multiplier:1,download_credits:1,min_balance:0,cnv_baseline_credits_per_gib:2};
    if(url.endsWith('/billing/transactions')) return {items:transactions,total:transactions.length,page:1,page_size:20,total_pages:1};
    return [];
  },
  put: async (url: string, body: any) => { const sample = /^\/v1\/samples\/([^/]+)$/.exec(url); if (sample) return savePreviewSample(body, decodeURIComponent(sample[1])); if (url.endsWith('/views')) { const views = previewViews(url); const current = views.find(item => item.name === body.name); if (current) Object.assign(current, { stateJson: JSON.stringify(body.state), version: current.version + 1 }); else views.push({ name: body.name, stateJson: JSON.stringify(body.state), version: 1 }); return; } throw new Error('预览不写入生产服务'); },
  post: async (url: string, body: Partial<PreviewSample>) => { if (url === '/v1/samples') return savePreviewSample(body); throw new Error('预览不提交任务'); },
  delete: async () => { throw new Error('预览不删除任务'); },
};
export const clearAuthSession = () => {};
export const clearLegacyAuthTokens = () => {};

export const MULTIPART_PART_SIZE_BYTES = 32 * 1024 * 1024;
export const MULTIPART_THRESHOLD_BYTES = 64 * 1024 * 1024;
const blockedUpload = async (..._args: any[]): Promise<any> => { throw new Error('隔离预览禁止上传或修改数据'); };
export const completeMultipartUpload = blockedUpload, confirmUpload = blockedUpload, initMultipartUpload = blockedUpload, presignMultipartParts = blockedUpload, getDataAssetUploadStatus = blockedUpload, recordMultipartPart = blockedUpload, requestPairedUploadJob = blockedUpload, requestPresignedUploadUrl = blockedUpload, startUpload = blockedUpload, uploadPartToCOS = blockedUpload, uploadToCOS = blockedUpload, retryS3Upload = blockedUpload;
export const abortMultipartUpload = blockedUpload, deleteUploadJob = blockedUpload;
export const localUploadURL = (..._args: any[]) => { throw new Error('隔离预览禁止上传'); };
export class UploadCancelledError extends Error {}
export const isUploadCancelled = (error: unknown) => error instanceof UploadCancelledError;
