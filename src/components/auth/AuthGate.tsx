'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
    router.replace(`/login?next=${encodeURIComponent(`${pathname}${currentSearch}`)}`);
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas-subtle">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-accent-emphasis" role="status" aria-label="正在加载" />
      </div>
    );
  }

  return <>{children}</>;
}
