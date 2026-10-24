import type { User } from '@/types/user';
import type { BackendFlavor } from './runtime-config';

export const BUSINESS_PERMISSIONS = [
  'samples.write',
  'data.manage',
  'tasks.manage',
  'pipelines.manage',
  'gene_lists.manage',
  'bed.manage',
  'baselines.manage',
  'report_services.manage',
  'interpretation_reports.manage',
] as const;

export type BusinessPermission = (typeof BUSINESS_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<BusinessPermission, string> = {
  'samples.write': '编辑样本',
  'data.manage': '管理数据文件',
  'tasks.manage': '管理任务',
  'pipelines.manage': '管理流程',
  'gene_lists.manage': '管理基因列表',
  'bed.manage': '管理 BED 文件',
  'baselines.manage': '管理基线',
  'report_services.manage': '管理报告服务',
  'interpretation_reports.manage': '解读与历史检出',
};

export function userHasPermission(user: User | null, permission: BusinessPermission, backend: BackendFlavor): boolean {
  if (backend === 'onykia') return true;
  return !!user && (user.systemRole === 'PLATFORM_ADMIN' || user.systemRole === 'SUPER_ADMIN' || user.permissions?.includes(permission) === true);
}

export function permissionForPath(path: string): BusinessPermission | null {
  if (path.startsWith('/samples')) return 'samples.write';
  if (path.startsWith('/data')) return 'data.manage';
  if (path.startsWith('/pipeline/gene-list')) return 'gene_lists.manage';
  if (path.startsWith('/pipeline/bed')) return 'bed.manage';
  if (path.startsWith('/pipeline/baseline')) return 'baselines.manage';
  if (path.startsWith('/pipeline/templates')) return 'report_services.manage';
  if (path.startsWith('/pipeline')) return 'pipelines.manage';
  if (path === '/tasks' || path.startsWith('/tasks/new')) return 'tasks.manage';
  if (path.startsWith('/tasks/') || path.startsWith('/history')) return 'interpretation_reports.manage';
  return null;
}
