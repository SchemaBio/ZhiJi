export type SystemRole = 'PLATFORM_ADMIN' | 'ORG_USER' | 'SUPER_ADMIN' | 'USER';

export type OrgRole = 'OWNER' | 'ADMIN' | 'DOCTOR' | 'ANALYST' | 'VIEWER';

export type ApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  maxConcurrentTasks?: number;
  balanceAlertThreshold?: number;
  storageQuotaBytes?: number;
  isActive?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  systemRole: SystemRole;
  permissions?: string[];
  primaryOrgId?: string;
  orgId?: string;
  isActive: boolean;
  approvalStatus?: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserOrganizationInfo extends Organization {
  orgRole: OrgRole;
  joinedAt?: string;
}
