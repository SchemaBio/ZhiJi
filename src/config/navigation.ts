import {
  Users,
  List,
  FileText,
  User,
  Shield,
  Coins,
  Workflow,
  FileCode,
  TrendingUp,
  Library,
  LayoutDashboard,
  ListTodo,
  History,
  HardDrive,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  saasOnly?: boolean;
  selfHostedOnly?: boolean;
  platformAdminOnly?: boolean;
}

export interface SidebarNavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string | number;
  children?: SidebarNavItem[];
  saasOnly?: boolean;
  selfHostedOnly?: boolean;
  platformAdminOnly?: boolean;
}

interface SidebarNavConfig {
  dashboard: SidebarNavItem[];
  samples: SidebarNavItem[];
  data: SidebarNavItem[];
  tasks: SidebarNavItem[];
  pipeline: SidebarNavItem[];
  history: SidebarNavItem[];
  settings: SidebarNavItem[];
  admin: SidebarNavItem[];
  billing: SidebarNavItem[];
}

export const mainNavItems: NavItem[] = [
  { label: '概览', href: '/dashboard', icon: LayoutDashboard },
  { label: '样本管理', href: '/samples', icon: Users },
  { label: '数据中心', href: '/data', icon: HardDrive },
  { label: '任务中心', href: '/tasks', icon: ListTodo },
  { label: '历史检出', href: '/history', icon: History, selfHostedOnly: true },
  { label: '流程中心', href: '/pipeline', icon: Workflow },
  { label: '平台管理', href: '/admin', icon: Shield, selfHostedOnly: true, platformAdminOnly: true },
  { label: '费用中心', href: '/billing', icon: Coins, saasOnly: true },
];

export const sidebarNavConfig: SidebarNavConfig = {
  dashboard: [],
  samples: [
    { label: '样本列表', href: '/samples', icon: List },
  ],
  data: [],
  tasks: [],
  pipeline: [
    { label: '流程列表', href: '/pipeline', icon: List },
    { label: '基因列表', href: '/pipeline/gene-list', icon: Library },
    { label: 'BED 文件', href: '/pipeline/bed', icon: FileCode },
    { label: '基线管理', href: '/pipeline/baseline', icon: TrendingUp },
    { label: '报告服务', href: '/pipeline/templates', icon: FileText, selfHostedOnly: true },
  ],
  history: [],
  settings: [
    { label: '个人设置', href: '/settings', icon: User },
  ],
  admin: [],
  billing: [
    { label: '费用概览', href: '/billing', icon: Coins, saasOnly: true },
  ],
};

export function getSectionFromPath(pathname: string): keyof SidebarNavConfig {
  const section = pathname.split('/').filter(Boolean)[0] || 'samples';
  if (section in sidebarNavConfig) return section as keyof SidebarNavConfig;
  return 'samples';
}

export function isNavItemActive(itemHref: string, currentPath: string): boolean {
  if (itemHref === currentPath) return true;
  const itemSegments = itemHref.split('/').filter(Boolean);
  const currentSegments = currentPath.split('/').filter(Boolean);
  if (itemSegments.length === 1) return currentSegments[0] === itemSegments[0];
  return currentPath.startsWith(itemHref);
}

export function isNavItemVisible(
  item: { saasOnly?: boolean; selfHostedOnly?: boolean; platformAdminOnly?: boolean },
  isSaaS: boolean,
  isAdmin: boolean,
): boolean {
  if (item.saasOnly && !isSaaS) return false;
  if (item.selfHostedOnly && isSaaS) return false;
  if (item.platformAdminOnly && !isAdmin) return false;
  return true;
}
