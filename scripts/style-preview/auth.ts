const allowPreviewPermission = () => true;
const signedOutRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
const user = {
  id: 'preview', name: '设计预览', email: 'preview@example.invalid', systemRole: 'PLATFORM_ADMIN',
  isActive: true, approvalStatus: 'approved', createdAt: '2026-10-08T09:00:00Z',
};
const currentOrg = { id: 'preview-org', name: '示例实验室' };

export function useAuth() {
  const forceSignedOut = location.pathname === '/' && new URLSearchParams(location.search).get('previewAuth') === 'signedout';
  return {
    isAuthenticated: !forceSignedOut && !signedOutRoutes.includes(location.pathname),
    isLoading: false,
    hasPermission: allowPreviewPermission,
    isPlatformAdmin: allowPreviewPermission,
    user,
    currentOrg,
    organizations: [],
    login: async () => { throw new Error('预览不登录'); },
    updateProfile: async () => { throw new Error('预览不保存账户'); },
    changePassword: async () => { throw new Error('预览不修改密码'); },
    logout: async () => {},
  };
}
