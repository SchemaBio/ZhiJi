'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BusinessPermissionContext } from './BusinessPermissionProvider';
import { userHasPermission, type BusinessPermission } from '@/lib/permissions';
import { getRuntimeBackendFlavor } from '@/lib/runtime-config';
import { LocalizedError } from '@/i18n/errors';
import type { User, UserOrganizationInfo, OrgRole } from '@/types/user';
import type { LoginResponse } from '@/types/auth';
import { authApi } from '@/lib/auth';
import { STORAGE_KEYS } from '@/lib/storage';
import { hashPassword } from '@/lib/crypto';

const DEV_MOCK_AUTH = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_MOCK_AUTH === 'true';

interface AuthContextType {
  hasPermission: (permission: BusinessPermission) => boolean;
  refreshSession: () => Promise<void>;
  user: User | null;
  organizations: UserOrganizationInfo[];
  currentOrg: UserOrganizationInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name: string }) => Promise<User>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  hasOrgRole: (role: OrgRole) => boolean;
  hasAnyOrgRole: (...roles: OrgRole[]) => boolean;
  isPlatformAdmin: () => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/privacy', '/verify-email', '/about'] as const;

function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.LEGACY_AUTH_TOKENS);
  localStorage.removeItem(STORAGE_KEYS.ORGANIZATIONS);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_ORG);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<UserOrganizationInfo[]>([]);
  const [currentOrg, setCurrentOrg] = useState<UserOrganizationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((nextUser: User, nextOrg: UserOrganizationInfo | null) => {
    setUser(nextUser);
    setOrganizations(nextOrg ? [nextOrg] : []);
    setCurrentOrg(nextOrg);
    if (!DEV_MOCK_AUTH) clearStoredAuth();
  }, []);

  const resetSession = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setOrganizations([]);
    setCurrentOrg(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSession = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        if (cancelled) return;
        const organization = await authApi.getCurrentOrganization().catch(() => null);
        if (cancelled) return;
        applySession(currentUser, organization ? { ...organization, orgRole: currentUser.systemRole === 'PLATFORM_ADMIN' ? 'OWNER' : 'VIEWER' } : null);
      } catch {
        if (!cancelled) resetSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadSession();
    return () => { cancelled = true; };
  }, [applySession, resetSession]);

  const login = useCallback(async (email: string, password: string, remember = false) => {
    setIsLoading(true);
    try {
      const hashedPassword = await hashPassword(password, email);
      const response: LoginResponse = await authApi.login({ email, password: hashedPassword, remember });
      applySession(response.user, response.currentOrg ?? response.organizations[0] ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn('Logout request failed; clearing local session anyway.', error);
    } finally {
      resetSession();
    }
  }, [resetSession]);

  const updateProfile = useCallback(async (data: { name: string }): Promise<User> => {
    if (!user) throw new LocalizedError('interface.notAuthenticated0c91ac');
    const nextUser = await authApi.updateProfile(data);
    setUser(nextUser);
    return nextUser;
  }, [user]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    if (!user) throw new LocalizedError('interface.notAuthenticated0c91ac');
    const [preparedOld, preparedNew] = await Promise.all([
      hashPassword(oldPassword, user.email),
      hashPassword(newPassword, user.email),
    ]);
    await authApi.changePassword({ old_password: preparedOld, new_password: preparedNew });
  }, [user]);

  const switchOrganization = useCallback(async (orgId: string) => {
    const org = organizations.find((item) => item.id === orgId);
    if (org) setCurrentOrg(org);
  }, [organizations]);

  const hasOrgRole = useCallback((role: OrgRole): boolean => {
    return currentOrg?.orgRole === role;
  }, [currentOrg]);

  const hasAnyOrgRole = useCallback((...roles: OrgRole[]): boolean => {
    return !!currentOrg && roles.includes(currentOrg.orgRole);
  }, [currentOrg]);

  const isPlatformAdmin = useCallback((): boolean => {
    return user?.systemRole === 'PLATFORM_ADMIN' || user?.systemRole === 'SUPER_ADMIN';
  }, [user]);

  const isSuperAdmin = isPlatformAdmin;
  const hasPermission = useCallback((permission: BusinessPermission) => userHasPermission(user, permission, getRuntimeBackendFlavor()), [user]);

  const refreshSession = useCallback(async () => {
    if (!user) return;
    try {
      setUser(await authApi.getCurrentUser());
    } catch {
      setUser((previous) => previous ? { ...previous, permissions: [] } : previous);
    }
  }, [user]);

  useEffect(() => {
    const refresh = () => { void refreshSession(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('schema:permissions-changed', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('schema:permissions-changed', refresh);
    };
  }, [refreshSession]);

  useEffect(() => {
    const handleAuthExpired = () => {
      resetSession();
      if (typeof window === 'undefined' || isPublicAuthPath(window.location.pathname)) return;
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
    };
    window.addEventListener('schema:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('schema:auth-expired', handleAuthExpired);
  }, [resetSession]);

  const value: AuthContextType = {
    hasPermission,
    refreshSession,
    user,
    organizations,
    currentOrg,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
    changePassword,
    switchOrganization,
    hasOrgRole,
    hasAnyOrgRole,
    isPlatformAdmin,
    isSuperAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      <BusinessPermissionContext.Provider value={hasPermission}>{children}</BusinessPermissionContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
