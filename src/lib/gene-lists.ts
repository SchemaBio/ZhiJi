import { api } from './api';
import { readResourcePages } from './resource-pages';

export interface GeneList {
  id: string;
  name: string;
  description: string;
  genes: string[];
  createdAt: string;
  updatedAt: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function rawString(raw: Record<string, unknown>, camel: string, snake: string): string {
  const value = raw[camel] ?? raw[snake];
  return typeof value === 'string' ? value : '';
}

export function normalizeGeneList(value: unknown): GeneList {
  const raw = asRecord(value);
  const genes = Array.isArray(raw.genes) ? raw.genes.map((gene) => String(gene).trim()).filter(Boolean) : [];
  return {
    id: String(raw.id ?? ''),
    name: rawString(raw, 'name', 'name'),
    description: rawString(raw, 'description', 'description'),
    genes,
    createdAt: rawString(raw, 'createdAt', 'created_at'),
    updatedAt: rawString(raw, 'updatedAt', 'updated_at'),
  };
}

export async function listGeneLists(): Promise<GeneList[]> {
  const rows = await readResourcePages<unknown>('/v1/gene-lists');
  return rows.map(normalizeGeneList).filter((list) => list.id);
}

export async function createGeneList(input: { name: string; description: string; genes: string[] }): Promise<GeneList> {
  return normalizeGeneList(await api.post('/v1/gene-lists', {
    name: input.name.trim(),
    description: input.description,
    genes: input.genes,
    category: 'optional',
  }));
}

export async function deleteGeneList(id: string): Promise<void> {
  await api.delete(`/v1/gene-lists/${encodeURIComponent(id)}`);
}
