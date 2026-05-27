// System-level roles
type SystemRole = 'SUPER_ADMIN' | 'USER';

// Organization-level roles
export type OrgRole = 'OWNER' | 'ADMIN' | 'DOCTOR' | 'ANALYST' | 'VIEWER';

// Organization info
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

// 用户信息
export interface User {
  id: string;
  email: string;
  name: string;
  systemRole: SystemRole;
  primaryOrgId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Organization info for user
export interface UserOrganizationInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  orgRole: OrgRole;
  joinedAt: string;
}

