import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { OncologyResultInspector } from './OncologyResultInspector';

const props = { taskId: 'task', related: [], historyRevision: 0, onNavigate: vi.fn(), onClose: vi.fn() };

it('shows a CNV segment track from valid coordinates and omits unsupplied segments', () => {
  const { rerender } = render(<OncologyResultInspector {...props} tab="cnv-chrom" row={{
    id: 'segment', values: { chromosome: '17q', copies: 3, fraction: 20 },
    cnvSegments: [
      { chromosome: 'chr17', start: 100, end: 200, logRatio: 0, copies: 3 },
      { chromosome: 'chr17', start: 300, end: 250, logRatio: 1 },
    ],
  }} />);
  fireEvent.click(screen.getByRole('tab', { name: '证据' }));
  let panel = within(screen.getByRole('tabpanel'));
  expect(panel.getByRole('rowheader', { name: '100–200' })).toBeInTheDocument();
  expect(panel.getByText('0')).toBeInTheDocument();
  expect(panel.queryByRole('rowheader', { name: '300–250' })).not.toBeInTheDocument();

  rerender(<OncologyResultInspector {...props} tab="cnv-chrom" row={{ id: 'segment', values: { chromosome: '17q' } }} />);
  panel = within(screen.getByRole('tabpanel'));
  expect(panel.queryByRole('region', { name: '分段区间图' })).not.toBeInTheDocument();
  expect(panel.getByText('未提供')).toBeInTheDocument();
});

it('compares mutant and wild-type predictions without filling missing evidence', () => {
  render(<OncologyResultInspector {...props} tab="neoantigen" row={{
    id: 'candidate', values: { variant: 'KRAS', peptide: 'GADGVGKSA', affinity: 38 }, details: { wildAffinity: 510 },
  }} />);
  const comparison = within(screen.getByRole('region', { name: '候选肽对照' }));
  expect(comparison.getByRole('columnheader', { name: '突变型' })).toBeInTheDocument();
  expect(comparison.getByRole('columnheader', { name: '野生型' })).toBeInTheDocument();
  expect(comparison.getByText('38')).toBeInTheDocument();
  expect(comparison.getByText('510')).toBeInTheDocument();
});
