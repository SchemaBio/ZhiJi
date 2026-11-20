import { expect, it } from 'vitest';
import { BUSINESS_PERMISSIONS, permissionForPath, userHasPermission } from './permissions';
import type { User } from '@/types/user';

const user: User = { id: '1', name: 'Reader', email: 'reader@example.invalid', systemRole: 'ORG_USER', isActive: true, createdAt: '', updatedAt: '' };
it('defaults ordinary self-hosted accounts to no grants and always grants administrators', () => {
  for (const permission of BUSINESS_PERMISSIONS) {
    expect(userHasPermission(user, permission, 'loligo')).toBe(false);
    expect(userHasPermission({ ...user, systemRole: 'PLATFORM_ADMIN' }, permission, 'loligo')).toBe(true);
    expect(userHasPermission(user, permission, 'onykia')).toBe(true);
  }
});
it('keeps baseline, interpretation and task grants independent', () => {
  const baselineUser = { ...user, permissions: ['baselines.manage'] };
  expect(userHasPermission(baselineUser, 'baselines.manage', 'loligo')).toBe(true);
  expect(userHasPermission(baselineUser, 'tasks.manage', 'loligo')).toBe(false);
  expect(userHasPermission(baselineUser, 'interpretation_reports.manage', 'loligo')).toBe(false);
  expect(permissionForPath('/pipeline/bed')).toBe('bed.manage');
  expect(permissionForPath('/tasks/new')).toBe('tasks.manage');
  expect(permissionForPath('/tasks/task-id')).toBe('interpretation_reports.manage');
});
