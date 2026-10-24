import { describe, expect, it } from 'vitest';
import { permissionForPath, userHasPermission } from './permissions';
import type { User } from '@/types/user';

const user = (permissions: string[]): User => ({
  id: 'u1',
  email: 'a@example.com',
  name: 'A',
  systemRole: 'ORG_USER',
  isActive: true,
  createdAt: '',
  updatedAt: '',
  permissions,
});

describe('permissions', () => {
  it('grants every business permission on onykia', () => {
    expect(userHasPermission(null, 'tasks.manage', 'onykia')).toBe(true);
  });

  it('requires an explicit grant on loligo', () => {
    expect(userHasPermission(user(['samples.write']), 'samples.write', 'loligo')).toBe(true);
    expect(userHasPermission(user(['samples.write']), 'tasks.manage', 'loligo')).toBe(false);
    expect(userHasPermission(null, 'tasks.manage', 'loligo')).toBe(false);
  });

  it('maps task interpretation paths', () => {
    expect(permissionForPath('/tasks/new')).toBe('tasks.manage');
    expect(permissionForPath('/history')).toBe('interpretation_reports.manage');
  });
});
