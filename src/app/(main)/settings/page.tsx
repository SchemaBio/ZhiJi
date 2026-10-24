'use client';

import * as React from 'react';
import { Button, Input } from '@schema/ui-kit';
import { PageContent } from '@/components/layout';
import { useAuth } from '@/components/providers/AuthProvider';
import { localeCookie, localeNames, locales, type Locale } from '@/i18n/locales';
import { useAppLocale } from '@/components/providers/LocaleProvider';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '保存失败';
}

export default function SettingsPage() {
  const { user, updateProfile, changePassword } = useAuth();
  const locale = useAppLocale();
  const [name, setName] = React.useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [nextPassword, setNextPassword] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => { setName(user?.name ?? ''); }, [user?.name]);

  const saveProfile = async () => {
    setError('');
    try {
      await updateProfile({ name });
      setMessage('资料已保存');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const savePassword = async () => {
    setError('');
    try {
      await changePassword(currentPassword, nextPassword);
      setCurrentPassword('');
      setNextPassword('');
      setMessage('密码已更新');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const chooseLocale = (next: Locale) => {
    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };

  return (
    <PageContent>
      <h2 className="text-lg font-medium text-fg-default mb-4">个人设置</h2>
      {error && <p className="mb-3 text-sm text-danger-fg">{error}</p>}
      {message && <p className="mb-3 text-sm text-success-fg">{message}</p>}
      <section className="mb-8 max-w-md space-y-3">
        <p className="text-sm text-fg-muted">{user?.email}</p>
        <Input value={name} onChange={(event) => setName(event.target.value)} />
        <Button variant="primary" onClick={() => void saveProfile()}>保存资料</Button>
      </section>
      <section className="mb-8 max-w-md space-y-3">
        <h3 className="text-sm font-medium">密码</h3>
        <Input type="password" placeholder="当前密码" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        <Input type="password" placeholder="新密码" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} />
        <Button variant="secondary" onClick={() => void savePassword()}>更新密码</Button>
      </section>
      <section className="max-w-md">
        <h3 className="mb-2 text-sm font-medium">界面语言</h3>
        <p className="mb-2 text-xs text-fg-muted">当前完整文案是简体中文。其他语言会回退到中文。</p>
        <div className="flex flex-wrap gap-2">
          {locales.map((item) => (
            <Button key={item} variant={item === locale ? 'primary' : 'secondary'} onClick={() => chooseLocale(item)}>
              {localeNames[item]}
            </Button>
          ))}
        </div>
      </section>
    </PageContent>
  );
}
