'use client';

import type { ReactNode } from 'react';
import { PageContent } from '@/components/layout';
import { getRuntimeBackendFlavor, type BackendFlavor } from '@/lib/runtime-config';

export function DeploymentNotice({ allow, title, children }: { allow: BackendFlavor; title: string; children: ReactNode }) {
  if (getRuntimeBackendFlavor() !== allow) {
    return (
      <PageContent>
        <h2 className="text-lg font-medium text-fg-default mb-2">{title}</h2>
        <p className="text-sm text-fg-muted">
          {allow === 'loligo'
            ? '此页面只在 Loligo 自部署实例中提供。'
            : '此页面只在 Onykia 网关实例中提供。'}
        </p>
      </PageContent>
    );
  }
  return <>{children}</>;
}
