'use client';

import * as React from 'react';
import { PageContent } from '@/components/layout';
import { DeploymentNotice } from '@/components/shared/DeploymentNotice';
import { listReportTemplates, type ReportTemplate } from '@/lib/reports';

export default function ReportServicesPage() {
  return (
    <DeploymentNotice allow="loligo" title="报告服务">
      <Templates />
    </DeploymentNotice>
  );
}

function Templates() {
  const [rows, setRows] = React.useState<ReportTemplate[]>([]);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    listReportTemplates()
      .then(setRows)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '无法读取报告服务'));
  }, []);

  return (
    <PageContent>
      <h2 className="mb-4 text-lg font-medium">报告服务</h2>
      {error && <p className="mb-3 text-sm text-danger-fg">{error}</p>}
      <ul className="divide-y divide-border border border-border rounded-md">
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-fg-muted">没有报告模板</li>}
        {rows.map((template) => (
          <li key={template.id} className="px-4 py-3 text-sm">
            <p className="font-medium">{template.name}</p>
            {template.description && <p className="text-fg-muted">{template.description}</p>}
          </li>
        ))}
      </ul>
    </PageContent>
  );
}
