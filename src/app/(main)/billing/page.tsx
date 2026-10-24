'use client';

import { PageContent } from '@/components/layout';
import { DeploymentNotice } from '@/components/shared/DeploymentNotice';

export default function BillingPage() {
  return (
    <DeploymentNotice allow="onykia" title="费用中心">
      <PageContent>
        <h2 className="text-lg font-medium text-fg-default mb-2">费用中心</h2>
        <p className="text-sm text-fg-muted">费用中心尚未接入。Onykia 的充值和账单会在后续版本提供。</p>
      </PageContent>
    </DeploymentNotice>
  );
}
