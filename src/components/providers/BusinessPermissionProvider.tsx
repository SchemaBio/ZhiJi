'use client';

import { createContext, useContext } from 'react';
import type { BusinessPermission } from '@/lib/permissions';

export const BusinessPermissionContext = createContext<((permission: BusinessPermission) => boolean) | null>(null);

export function useBusinessPermissions() {
  const check = useContext(BusinessPermissionContext);
  return { hasPermission: check ?? (() => false) };
}
