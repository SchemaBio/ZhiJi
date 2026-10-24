'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Input } from '@schema/ui-kit';
import { authApi } from '@/lib/auth';

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<main className="p-8">正在读取重置链接…</main>}>
      <ResetForm />
    </React.Suspense>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await authApi.resetPassword(token, password);
      setMessage('密码已重置，可以登录了。');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="mb-4 text-2xl font-semibold">重置密码</h1>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        {error && <p className="text-sm text-danger-fg">{error}</p>}
        {message && <p className="text-sm text-success-fg">{message}</p>}
        <Input type="password" value={password} placeholder="新密码" onChange={(event) => setPassword(event.target.value)} />
        <Button type="submit" variant="primary" disabled={!token}>保存新密码</Button>
      </form>
      <Link href="/login" className="mt-4 text-sm text-accent-fg">返回登录</Link>
    </main>
  );
}
