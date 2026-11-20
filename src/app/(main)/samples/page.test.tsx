import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import SamplesPage from './page';
import { listSamples } from '@/lib/samples';
import { downloadSampleList } from '@/lib/sample-export';
import type { Sample } from './types';
const mode=vi.hoisted(()=>({backend:'loligo'}));
vi.mock('@/lib/runtime-config',()=>({getRuntimeBackendFlavor:()=>mode.backend}));
beforeEach(()=>{mode.backend='loligo';});
vi.mock('@/lib/sample-export', () => ({ downloadSampleList: vi.fn() }));
vi.mock('@/lib/samples', () => ({ listSamples: vi.fn(), normalizeSample: vi.fn(), samplePayload: vi.fn() }));
vi.mock('./components', () => ({ NewSampleModal: () => null, EditSampleModal: () => null, DataLinkModal: () => null }));
it('keeps failed reads distinct from empty samples and recovers on retry', async () => {
  vi.mocked(listSamples).mockRejectedValueOnce(new Error('样本读取失败')).mockResolvedValueOnce([]);
  render(<SamplesPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('样本读取失败');
  expect(screen.queryByText('暂无样本')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '批量导入' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '重试读取' }));
  await screen.findByText('暂无样本');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('搜索样本编号、批次、癌种或取材部位…'), { target: { value: 'missing' } });
  expect(screen.getByText('没有匹配的样本')).toBeInTheDocument();
});

it('exports checked samples retained across pages and searches', async () => {
  const sample = (id: string): Sample => ({ id, internalId: `INT-${id}`, gender: 'unknown', sampleType: '全血', batch: '', clinicalDiagnosis: '', hpoTerms: [], matchedPair: null, matchStatus: 'unmatched', matchMode: '', autoMatchEnabled: false, remark: '', createdAt: '2026-10-12T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z' });
  const samples = [sample('first'), ...Array.from({ length: 14 }, (_, i) => sample(String(i))), sample('last')];
  vi.mocked(listSamples).mockResolvedValue(samples);
  render(<SamplesPage />);
  await screen.findByText('INT-first');
  expect(screen.getAllByRole('columnheader').slice(1, 3).map(header => header.textContent)).toEqual(['内部编号', 'UUID']);
  expect(screen.getByRole('button', { name: '导出已选样本' })).toBeDisabled();
  expect(screen.getAllByRole('row')).toHaveLength(16);
  fireEvent.click(within(screen.getByText('INT-first').closest('tr')!).getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: '下一页' }));
  expect(screen.getAllByRole('row')).toHaveLength(2);
  fireEvent.click(within(screen.getByText('INT-last').closest('tr')!).getByRole('checkbox'));
  fireEvent.change(screen.getByPlaceholderText('搜索样本编号、批次、癌种或取材部位…'), { target: { value: 'INT-first' } });
  expect(within(screen.getByText('INT-first').closest('tr')!).getByRole('checkbox')).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: '导出已选样本 (2)' }));
  expect(downloadSampleList).toHaveBeenCalledWith([samples[0], samples[15]], 'zh-CN');
});

it('does not expose bulk import or template download in SaaS', async()=>{
 mode.backend='onykia';vi.mocked(listSamples).mockResolvedValue([]);render(<SamplesPage />);
 await screen.findByText('暂无样本');
 expect(screen.queryByRole('button',{name:'批量导入'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'下载模板'})).not.toBeInTheDocument();
});
