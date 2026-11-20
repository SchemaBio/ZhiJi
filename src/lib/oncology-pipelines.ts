import type { TextTranslator } from '@/i18n/text';

const workflowTypes = [
  { kind: 'tumor_paired', key: 'paired', id: 'builtin-tumor-paired', template: 'tumor_paired' },
  { kind: 'tumor_single', key: 'single', id: 'builtin-tumor-single', template: 'tumor_single' },
  { kind: 'vcf_annotation', key: 'vcf', id: 'builtin-vcf2anno', template: 'vcf2anno' },
  { kind: 'rna_fusion', key: 'rna', id: 'builtin-rna-fusion', template: 'rna_fusion' },
] as const;

export type OncologyPipelineKind = typeof workflowTypes[number]['kind'];
export const oncologyPipelines = workflowTypes.flatMap(workflow => (['hg19', 'hg38'] as const).map(genome => ({
  ...workflow,
  id: `${workflow.id}-${genome}`,
  genome,
})));

export function oncologyPipelineLabel(kind: string, t: TextTranslator): string {
  const workflow = workflowTypes.find(item => item.kind === kind);
  return workflow ? t(`oncologyWorkflow.${workflow.key}`) : kind;
}

export function isLegacyBuiltinPipeline(id: string): boolean {
  return /^builtin-wes-(single|family)(?:-hg(?:19|38))?$/.test(id);
}

/** Keep available server records authoritative. Missing entries are display-only. */
export function withOncologyPipelineCatalog(items: unknown[]): unknown[] {
  const records = items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  const expected = new Set<string>(oncologyPipelines.map(item => item.id));
  return [
    ...oncologyPipelines.map(item => records.find(record => record.id === item.id) ?? {
      id: item.id, name: item.id, base_pipeline_id: item.id, base_type: item.kind, template: item.template,
      reference_genome: item.genome, is_builtin: true, status: 'inactive', resource_available: false, planned: true,
    }),
    ...records.filter(record => typeof record.id === 'string' && !expected.has(record.id) && !isLegacyBuiltinPipeline(record.id)),
  ];
}
