import type { User, UserOrganizationInfo } from './user';

// 登录请求
export interface LoginRequest {
  email: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  user: User;
  organizations: UserOrganizationInfo[];
  currentOrg?: UserOrganizationInfo;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

// 刷新 Token 请求
export interface RefreshTokenRequest {
  refreshToken: string;
}

// 刷新 Token 响应
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

