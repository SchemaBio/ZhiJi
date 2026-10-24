import { api, clearAuthSession, clearLegacyAuthTokens } from './api';
import type { LoginRequest, LoginResponse } from '@/types/auth';
import type { Organization, OrgRole, SystemRole, User, UserOrganizationInfo } from '@/types/user';

interface BackendOrganization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  max_concurrent_tasks?: number;
  balance_alert_threshold?: number;
  storage_quota_bytes?: number;
  is_active?: boolean;
}

interface BackendUser {
  id: string;
  email: string;
  name: string;
  permissions?: string[];
  system_role: string;
  org_id?: string;
  primary_org_id?: string;
  is_active: boolean;
  approval_status?: 'approved' | 'pending' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface BackendLoginData {
  user: BackendUser;
  organization?: BackendOrganization | null;
  organizations?: BackendOrganization[];
  current_org?: BackendOrganization | null;
}

function mapSystemRole(role: string): SystemRole {
  return role === 'PLATFORM_ADMIN' || role === 'SUPER_ADMIN' ? 'PLATFORM_ADMIN' : 'ORG_USER';
}

function orgRoleFor(role: SystemRole): OrgRole {
  return role === 'PLATFORM_ADMIN' || role === 'SUPER_ADMIN' ? 'OWNER' : 'VIEWER';
}

function mapUser(user: BackendUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    permissions: user.permissions ?? [],
    systemRole: mapSystemRole(user.system_role),
    orgId: user.org_id,
    primaryOrgId: user.primary_org_id,
    isActive: user.is_active,
    approvalStatus: user.approval_status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function mapOrganization(org: BackendOrganization, role: SystemRole): UserOrganizationInfo {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description,
    orgRole: orgRoleFor(role),
    maxConcurrentTasks: org.max_concurrent_tasks,
    balanceAlertThreshold: org.balance_alert_threshold,
    storageQuotaBytes: org.storage_quota_bytes,
    isActive: org.is_active,
  };
}

function mapLoginResponse(data: BackendLoginData): LoginResponse {
  const systemRole = mapSystemRole(data.user.system_role);
  const rawCurrentOrg = data.organization ?? data.current_org ?? data.organizations?.[0] ?? null;
  const currentOrg = rawCurrentOrg ? mapOrganization(rawCurrentOrg, systemRole) : undefined;
  const organizations = data.organizations?.length
    ? data.organizations.map((org) => mapOrganization(org, systemRole))
    : currentOrg ? [currentOrg] : [];
  return { user: mapUser(data.user), organizations, currentOrg };
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const backendData = await api.post<BackendLoginData>('/v1/auth/login', data, { coreApi: false });
    clearLegacyAuthTokens();
    return mapLoginResponse(backendData);
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/v1/auth/logout', undefined, { coreApi: false });
    } finally {
      clearAuthSession();
    }
  },

  changePassword: async (data: { old_password: string; new_password: string }): Promise<void> => {
    await api.post('/v1/auth/password', data, { coreApi: false });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/v1/auth/forgot-password', { email }, { coreApi: false });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await api.post('/v1/auth/reset-password', { token, new_password: newPassword }, { coreApi: false });
  },

  verifyEmail: async (token: string): Promise<void> => {
    await api.post('/v1/auth/registration/verify', { token }, { coreApi: false });
  },

  getCurrentUser: async (): Promise<User> => mapUser(await api.get<BackendUser>('/v1/auth/me', { coreApi: false })),

  updateProfile: async (data: { name: string }): Promise<User> => {
    return mapUser(await api.put<BackendUser>('/v1/auth/me', { name: data.name }, { coreApi: false }));
  },

  getCurrentOrganization: async (): Promise<Organization> => {
    const backendData = await api.get<BackendOrganization>('/v1/orgs/me', { coreApi: false });
    return {
      id: backendData.id,
      name: backendData.name,
      slug: backendData.slug,
      description: backendData.description,
      maxConcurrentTasks: backendData.max_concurrent_tasks,
      balanceAlertThreshold: backendData.balance_alert_threshold,
      storageQuotaBytes: backendData.storage_quota_bytes,
      isActive: backendData.is_active,
    };
  },
};
