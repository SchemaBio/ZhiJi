import type { OncologyResultRow, OncologyResultSummary, OncologyResultTab } from '../../src/app/(main)/tasks/[uuid]/oncology-results';
import type { SNVIndel } from '../../src/app/(main)/tasks/[uuid]/types';
import type { findPreviewTaskFixture } from './oncology-fixtures';

type Fixture = NonNullable<ReturnType<typeof findPreviewTaskFixture>>;
type Module = OncologyResultSummary & { rows: OncologyResultRow[] };
const tagged = (name: string) => 'oncologyResults.' + name;
const module = (...rows: OncologyResultRow[]): Module => ({ state: 'ready', total: rows.length, rows });

export function previewSNVRows({ task, genome }: Fixture): SNVIndel[] {
  if (task.template === 'rna_fusion') return [];
  const hg38 = genome === 'hg38';
  const variants = [
    { id: 'kr-g12d', gene: 'KRAS', chromosome: '12', position: hg38 ? 25245350 : 25398284, ref: 'C', alt: 'T',
      transcript: 'NM_004985.5', hgvsc: 'c.35G>A', hgvsp: 'p.(Gly12Asp)', depth: 350, alleleFrequency: 0.286, rsId: 'rs121913529' },
    { id: 'eg-l858r', gene: 'EGFR', chromosome: '7', position: hg38 ? 55191822 : 55259515, ref: 'T', alt: 'G',
      transcript: 'NM_005228.5', hgvsc: 'c.2573T>G', hgvsp: 'p.(Leu858Arg)', depth: 250, alleleFrequency: 0.144, rsId: 'rs121434568' },
  ];
  return variants.map(variant => ({
    ...variant, variantType: 'SNV', zygosity: 'Unknown', consequence: 'missense_variant',
    pinned: false, focused: false, reviewed: false, reported: false,
    annotationValues: { Gene: variant.gene, Chromosome: variant.chromosome, Position: String(variant.position),
      Depth: String(variant.depth), VAF: String(variant.alleleFrequency) },
  }));
}

export function previewOncologyResults({ task, sample, normalSample, genome }: Fixture): Partial<Record<OncologyResultTab, Module>> {
  const hg38 = genome === 'hg38';
  const paired = Boolean(normalSample);
  const annotation = task.template === 'vcf2anno';
  const rna = task.template === 'rna_fusion';
  const variants = previewSNVRows({ task, sample, normalSample, genome });
  const linkToSNV = ({ id, chromosome, position, hgvsp }: SNVIndel) =>
    ({ tab: 'snv-indel' as const, id, label: hgvsp, locus: { chromosome, position } });
  const fusion = module({
    id: 'fusion-01', values: {
      partners: sample.cancer_type === '甲状腺癌' ? 'CCDC6 → RET' : 'EML4 → ALK',
      exons: sample.cancer_type === '甲状腺癌' ? 'Exon 1 → Exon 12' : 'Exon 13 → Exon 20',
      source: rna ? 'RNA' : 'DNA', frame: rna ? 'In-frame' : '—', splitReads: rna ? 67 : 10, spanningPairs: rna ? 31 : 18, review: tagged('toReview'),
    },
    details: {
      breakpoint5: sample.cancer_type === '甲状腺癌' ? (hg38 ? 'chr10:59838928 (+)' : 'chr10:61600000 (+)') : (hg38 ? 'chr2:42312000 (+)' : 'chr2:42422000 (+)'),
      breakpoint3: sample.cancer_type === '甲状腺癌' ? (hg38 ? 'chr10:43120000 (+)' : 'chr10:43612000 (+)') : (hg38 ? 'chr2:29224000 (−)' : 'chr2:29450000 (−)'),
      transcript: sample.cancer_type === '甲状腺癌' ? 'NM_005436.5 → NM_020975.6' : 'NM_019063.5 → NM_004304.5', assaySample: sample.internal_id, method: 'Mock Fusion v1',
    },
  });
  if (rna) return { fusion };

  const hotspots = module(...variants.map(item => ({
    id: 'hot-' + item.id,
    variant: item,
    values: { gene: item.gene, locus: item.hgvsc + ' · ' + item.hgvsp, status: tagged('detected'),
      depth: item.depth, tumorVaf: item.alleleFrequency === undefined ? null : Number((item.alleleFrequency * 100).toFixed(1)) },
    details: { position: 'chr' + item.chromosome + ':' + item.position, database: 'Mock Hotspots v1',
      coverage: annotation ? 'VCF record only' : 'Targeted sequencing' },
    related: [linkToSNV(item)],
  })));
  if (annotation) return { hotspot: hotspots };
  const unresolvedHotspot = (id: string, gene: string, hgvsp: string, depth = Number.NaN): SNVIndel => ({
    id, gene, chromosome: '', position: 0, ref: '', alt: '', variantType: 'SNV', zygosity: 'Unknown',
    depth, transcript: '', hgvsc: '', hgvsp, consequence: '', hotspotTargetOnly: true,
    pinned: false, focused: false, reviewed: false, reported: false,
  });
  const hotspot = module(...hotspots.rows, {
    id: 'hot-negative', variant: unresolvedHotspot('hot-negative', 'BRAF', 'p.Val600Glu', 170), values: { gene: 'BRAF', locus: 'p.Val600Glu', status: tagged('notDetected'), depth: 170, tumorVaf: null },
    details: { database: 'Mock Hotspots v1', coverage: '170× / ≥100×' },
  }, {
    id: 'hot-low', variant: unresolvedHotspot('hot-low', 'PIK3CA', 'p.His1047Arg', 18), values: { gene: 'PIK3CA', locus: 'p.His1047Arg', status: tagged('lowCoverage'), depth: 18, tumorVaf: null },
    details: { database: 'Mock Hotspots v1', coverage: '18× / ≥100×' },
  }, {
    id: 'hot-not-covered', variant: unresolvedHotspot('hot-not-covered', 'KIT', ''), values: { gene: 'KIT', locus: 'Exon 11', status: tagged('notCovered'), depth: null, tumorVaf: null },
    details: { database: 'Mock Hotspots v1', coverage: 'Outside mock assay scope' },
  }, {
    id: 'hot-not-run', variant: unresolvedHotspot('hot-not-run', 'TERT', ''), values: { gene: 'TERT', locus: 'Promoter', status: tagged('notRun'), depth: null, tumorVaf: null },
    details: { database: 'Mock Hotspots v1' },
  });

  const cnvInterval = hg38 ? 'chr17:38000000–82000000' : 'chr17:37000000–80000000';
  const neoantigen = module({
    id: 'neo-01',
    values: { variant: 'KRAS ' + variants[0].hgvsp, peptide: 'GADGVGKSA', hla: 'HLA-A*02:01', affinity: 38, rank: 0.42, expression: '12.7 TPM' },
    details: { wildPeptide: 'GAGGVGKSA', wildAffinity: 510, method: 'Mock binding predictor v1', hlaSource: 'Mock matched-normal HLA typing' },
    related: [linkToSNV(variants[0])],
  });
  const runsGermline = task.id === 'preview-task' || task.id === 'preview-task-18';
  const germline = task.id === 'preview-task-18' ? module() : module({
    id: 'germline-01',
    variant: {
      id: 'germline-01', gene: 'BRCA2', chromosome: '13', position: hg38 ? 32356512 : 32930646,
      ref: 'A', alt: 'T', variantType: 'SNV', zygosity: 'Heterozygous', hgvsc: 'c.7008-2A>T', hgvsp: '',
      transcript: 'NM_000059.4', consequence: 'splice_acceptor_variant', alleleFrequency: 58 / 120, depth: 120,
      acmgClassification: 'Likely_Pathogenic', acmgCriteria: ['PVS1', 'PM2'], gnomadAF: 0.00001,
      pinned: false, focused: false, reviewed: false, reported: false,
    },
    values: { gene: 'BRCA2', variant: 'c.7008-2A>T', genotype: '0/1', normalVaf: 48.3, normalDepth: 120,
      classification: 'Likely pathogenic', review: tagged('toReview') },
    details: { position: hg38 ? 'chr13:32356512' : 'chr13:32930646', alleles: 'A → T', transcript: 'NM_000059.4',
      normalReads: '58 / 120', tumorReads: '74 / 152', populationAF: '0.00001', criteria: 'PVS1_Strong · PM2_Supporting (mock)', database: 'Mock ClinVar snapshot' },
  });
  const isDlbcl = sample.cancer_type === '弥漫大 B 细胞淋巴瘤';
  const biomarkers = module({
    id: 'MSI', values: { metric: 'MSI', result: hg38 ? 'MSS' : null,
      interpretation: hg38 ? 'MSS' : tagged('indeterminate'), status: tagged(hg38 ? 'ready' : 'indeterminate'), method: 'Mock MSI v1' },
    details: { analyzableSites: hg38 ? '83 / 100' : '24 / 100', threshold: '≥ 40 evaluable loci (mock)', qc: hg38 ? tagged('pass') : tagged('lowCoverage') },
  }, {
    id: 'DLBCL', values: { metric: 'DLBCL', result: isDlbcl ? 'MCD' : null, interpretation: isDlbcl ? 'MCD' : null,
      status: tagged(isDlbcl ? 'ready' : 'notRun'), method: isDlbcl ? 'Mock LymphGen output' : null },
    details: isDlbcl ? { coo: 'ABC', geneticSubtype: 'MCD', confidence: '0.91' } : undefined,
  }, {
    id: 'HRD', values: { metric: 'HRD Score', result: paired ? 46 : null,
      interpretation: paired ? 'HRD-high (mock)' : null, status: tagged(paired ? 'ready' : 'notRun'), method: paired ? 'Mock HRD v1' : null },
    details: paired ? { threshold: '42 (mock)', loh: 16, 'detail.TAI': 12, 'detail.LST': 18 } : undefined,
  }, {
    id: 'TMB', values: { metric: 'TMB', result: '8 mut/Mb', interpretation: null, status: tagged('ready'), method: 'Mock TMB v1' },
    details: { variantCount: 24, analyzableMb: 3, threshold: null },
  });
  return {
    'cnv-gene': module({
      id: 'cnv-erbb2',
      values: { gene: 'ERBB2', event: 'Gain', copies: 3.4, logRatio: 0.63, scope: 'Whole gene', qc: tagged('pass') },
      details: { position: hg38 ? 'chr17:39700000–39880000' : 'chr17:37840000–37900000', segments: cnvInterval, exons: 'Exons 1–27', purity: '61%', ploidy: 2.2, method: 'Mock CNV v1' },
      related: [{ tab: 'cnv-chrom', id: 'cnv-17q', label: '17q · Gain' }],
    }, {
      id: 'cnv-pten',
      values: { gene: 'PTEN', event: 'Loss', copies: 1.2, logRatio: -0.68, scope: 'Partial gene', qc: tagged('pass') },
      details: { exons: 'Exons 3–5', purity: '61%', ploidy: 2.2, method: 'Mock CNV v1' },
    }),
    ...(paired ? { fusion } : {}),
    ...(paired ? { chemotherapy: module({
      id: 'dpyd-01', values: { gene: 'DPYD', locus: 'rs3918290', genotype: 'C/T (forward strand)', phenotype: 'Intermediate metabolizer (mock)',
        drug: 'Fluoropyrimidines', evidence: 'CPIC (mock mapping)' },
      details: { assaySample: normalSample?.internal_id ?? null, source: 'Matched normal', alleles: 'NM_000110.4:c.1905+1G>A',
        qc: tagged('pass'), database: 'Mock CPIC mapping v1', interpretation: 'Mock activity score 1.0' },
    }) } : {}),
    hotspot, biomarkers,
    'cnv-chrom': module({
      id: 'cnv-17q',
      values: { chromosome: '17q', event: 'Gain', interval: cnvInterval, length: hg38 ? 44 : 43, fraction: 85, copies: 3.4 },
      details: { segments: cnvInterval, logRatio: 0.63, baf: '0.32 / 0.68', qc: tagged('pass') },
      related: [{ tab: 'cnv-gene', id: 'cnv-erbb2', label: 'ERBB2 · Gain' }],
    }),
    ...(paired ? { neoantigen, germline: runsGermline ? germline : { state: 'notRun', rows: [] } } : {}),
  };
}
