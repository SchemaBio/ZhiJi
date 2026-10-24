'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, Input } from '@schema/ui-kit';
import { authApi } from '@/lib/auth';
import { getRuntimePasswordResetEnabled } from '@/lib/runtime-config';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const enabled = getRuntimePasswordResetEnabled();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setMessage('如果这个邮箱已注册，重置说明会发送到邮箱。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="mb-2 text-2xl font-semibold">忘记密码</h1>
      {!enabled && <p className="mb-4 text-sm text-fg-muted">当前实例没有开启密码重置。请联系实例管理员。</p>}
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        {error && <p className="text-sm text-danger-fg">{error}</p>}
        {message && <p className="text-sm text-success-fg">{message}</p>}
        <Input type="email" value={email} placeholder="邮箱" onChange={(event) => setEmail(event.target.value)} />
        <Button type="submit" variant="primary" disabled={!enabled}>发送重置邮件</Button>
      </form>
      <Link href="/login" className="mt-4 text-sm text-accent-fg">返回登录</Link>
    </main>
  );
}
