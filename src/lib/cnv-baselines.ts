import { api } from './api';

export interface CNVBaseline {
  id: string;
  name: string;
  reference_genome: string;
  status: string;
  progress: number;
  created_at: string;
  error?: string;
}

export async function listCNVBaselines(): Promise<CNVBaseline[]> {
  const value = await api.get<CNVBaseline[] | { items?: CNVBaseline[] }>('/v1/cnv-baselines');
  return Array.isArray(value) ? value : value.items ?? [];
}

export async function deleteCNVBaseline(id: string): Promise<void> {
  await api.delete(`/v1/cnv-baselines/${encodeURIComponent(id)}`);
}
