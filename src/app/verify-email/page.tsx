'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/auth';

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={<main className="p-8">正在验证邮箱…</main>}>
      <Verify />
    </React.Suspense>
  );
}

function Verify() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [message, setMessage] = React.useState(token ? '正在验证邮箱…' : '缺少验证令牌');

  React.useEffect(() => {
    if (!token) return;
    authApi.verifyEmail(token)
      .then(() => setMessage('邮箱已验证，可以登录。'))
      .catch((err: unknown) => setMessage(err instanceof Error ? err.message : '验证失败'));
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="mb-3 text-2xl font-semibold">验证邮箱</h1>
      <p className="text-sm text-fg-muted">{message}</p>
      <Link href="/login" className="mt-4 text-sm text-accent-fg">返回登录</Link>
    </main>
  );
}
