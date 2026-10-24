import type { User, UserOrganizationInfo } from './user';

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  user: User;
  organizations: UserOrganizationInfo[];
  currentOrg?: UserOrganizationInfo;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}
