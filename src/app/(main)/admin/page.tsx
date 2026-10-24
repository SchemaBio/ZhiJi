'use client';

import * as React from 'react';
import { Button, Input } from '@schema/ui-kit';
import { PageContent } from '@/components/layout';
import { DeploymentNotice } from '@/components/shared/DeploymentNotice';
import { useAuth } from '@/components/providers/AuthProvider';
import { BUSINESS_PERMISSIONS, PERMISSION_LABELS, type BusinessPermission } from '@/lib/permissions';
import { approveUser, createUser, deleteUser, listPendingUsers, listUsers, rejectUser, updateUser } from '@/lib/users';
import type { User } from '@/types/user';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败';
}

export default function AdminPage() {
  return (
    <DeploymentNotice allow="loligo" title="平台管理">
      <AdminContent />
    </DeploymentNotice>
  );
}

function AdminContent() {
  const { isPlatformAdmin } = useAuth();
  const [users, setUsers] = React.useState<User[]>([]);
  const [pending, setPending] = React.useState<User[]>([]);
  const [error, setError] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [admin, setAdmin] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [page, waiting] = await Promise.all([listUsers({ pageSize: 50 }), listPendingUsers().catch(() => [])]);
      setUsers(page.items);
      setPending(waiting);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  if (!isPlatformAdmin()) {
    return <PageContent><p className="text-sm text-fg-muted">只有平台管理员可以管理账户。</p></PageContent>;
  }

  const create = async () => {
    try {
      await createUser({
        email,
        name,
        password,
        systemRole: admin ? 'PLATFORM_ADMIN' : 'ORG_USER',
        permissions: admin ? [...BUSINESS_PERMISSIONS] : [],
      });
      setEmail('');
      setName('');
      setPassword('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const togglePermission = async (user: User, permission: BusinessPermission) => {
    const current = new Set(user.permissions ?? []);
    if (current.has(permission)) current.delete(permission);
    else current.add(permission);
    try {
      await updateUser(user.id, { permissions: [...current] });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <PageContent>
      <h2 className="text-lg font-medium text-fg-default mb-4">平台管理</h2>
      {error && <p className="mb-3 text-sm text-danger-fg">{error}</p>}
      <div className="mb-6 grid gap-2 md:grid-cols-4">
        <Input placeholder="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
        <Input placeholder="姓名" value={name} onChange={(event) => setName(event.target.value)} />
        <Input placeholder="密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <div className="flex items-center gap-3">
          <label className="text-sm"><input type="checkbox" checked={admin} onChange={(event) => setAdmin(event.target.checked)} /> 平台管理员</label>
          <Button variant="primary" onClick={() => void create()}>创建</Button>
        </div>
      </div>
      {pending.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-medium">待审核</h3>
          {pending.map((user) => (
            <div key={user.id} className="mb-2 flex items-center gap-3 text-sm">
              <span>{user.email}</span>
              <button type="button" className="text-accent-fg" onClick={() => void approveUser(user.id).then(load)}>通过</button>
              <button type="button" className="text-danger-fg" onClick={() => void rejectUser(user.id).then(load)}>拒绝</button>
            </div>
          ))}
        </section>
      )}
      <div className="space-y-4">
        {users.map((user) => (
          <article key={user.id} className="rounded-md border border-border p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{user.name} · {user.email}</p>
                <p className="text-xs text-fg-muted">{user.systemRole === 'PLATFORM_ADMIN' ? '平台管理员' : '普通用户'} · {user.isActive ? '启用' : '停用'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => void updateUser(user.id, { isActive: !user.isActive }).then(load)}>
                  {user.isActive ? '停用' : '启用'}
                </Button>
                <Button variant="secondary" onClick={() => void deleteUser(user.id).then(load)}>删除</Button>
              </div>
            </div>
            {user.systemRole !== 'PLATFORM_ADMIN' && (
              <div className="flex flex-wrap gap-3 text-xs">
                {BUSINESS_PERMISSIONS.map((permission) => (
                  <label key={permission}>
                    <input
                      type="checkbox"
                      checked={user.permissions?.includes(permission) === true}
                      onChange={() => void togglePermission(user, permission)}
                    /> {PERMISSION_LABELS[permission]}
                  </label>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </PageContent>
  );
}
