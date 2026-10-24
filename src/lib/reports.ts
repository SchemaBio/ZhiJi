import { api } from './api';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
}

export async function listReportTemplates(): Promise<ReportTemplate[]> {
  const value = await api.get<ReportTemplate[] | { items?: ReportTemplate[] }>('/v1/report-templates');
  const items = Array.isArray(value) ? value : value.items ?? [];
  return items.filter((item) => item.id && item.name);
}
