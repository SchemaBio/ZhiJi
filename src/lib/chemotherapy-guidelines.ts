// Curated chemotherapy pharmacogenetics references. Identifiers are reference data,
// while genotype calls and patient results come from the analysis workflow.
const guidelines = {
  dpyd: {
    label: 'CPIC · DPYD / fluoropyrimidines',
    url: 'https://cpicpgx.org/guidelines/guideline-for-fluoropyrimidines-and-dpyd/',
    clinpgx: 'https://www.clinpgx.org/guidelineAnnotation/PA166109594/annotation',
    markers: 'https://cpicpgx.org/wp-content/uploads/2024/08/CPIC-AMP-DPYD-PGx-recommendations.pdf',
    drugs: ['fluorouracil', 'capecitabine'],
  },
  ugt1a1: {
    label: 'DPWG · UGT1A1 / irinotecan',
    url: 'https://pubmed.ncbi.nlm.nih.gov/36443464/',
    drugs: ['irinotecan'],
  },
  thiopurines: {
    label: 'CPIC · TPMT / NUDT15 · 2025',
    url: 'https://doi.org/10.1002/cpt.70209',
    clinpgx: 'https://blog.clinpgx.org/cpic-guideline-for/',
    drugs: ['mercaptopurine', 'thioguanine'],
  },
} as const;

type MarkerType = 'variant' | 'haplotype' | 'repeat' | 'proxy';
export type ReferenceMarker = {
  gene: 'DPYD' | 'UGT1A1' | 'TPMT' | 'NUDT15';
  name: string;
  rsIds: string[];
  type: MarkerType;
  guideline: keyof typeof guidelines;
  definition?: string;
  definitionUrl?: string;
};

export const chemotherapyGuidelines = guidelines;
export const chemotherapyGuidelineMarkers: readonly ReferenceMarker[] = [
  { gene: 'DPYD', name: '*2A', rsIds: ['rs3918290'], definition: 'NM_000110.4:c.1905+1G>A', type: 'variant', guideline: 'dpyd' },
  { gene: 'DPYD', name: '*13', rsIds: ['rs55886062'], definition: 'NM_000110.4:c.1679T>G', type: 'variant', guideline: 'dpyd' },
  { gene: 'DPYD', name: 'c.2846A>T', rsIds: ['rs67376798'], definition: 'NM_000110.4:c.2846A>T', type: 'variant', guideline: 'dpyd' },
  { gene: 'DPYD', name: 'HapB3', rsIds: ['rs75017182'], definition: 'NM_000110.4:c.1129-5923C>G', type: 'haplotype', guideline: 'dpyd' },
  { gene: 'DPYD', name: 'HapB3', rsIds: ['rs56038477'], definition: 'NM_000110.4:c.1236G>A', type: 'proxy', guideline: 'dpyd' },
  { gene: 'DPYD', name: 'c.557A>G', rsIds: ['rs115232898'], definition: 'NM_000110.4:c.557A>G', type: 'variant', guideline: 'dpyd' },
  { gene: 'DPYD', name: 'c.868A>G', rsIds: ['rs146356975'], definition: 'NM_000110.4:c.868A>G', type: 'variant', guideline: 'dpyd' },
  { gene: 'DPYD', name: 'c.2279C>T', rsIds: ['rs112766203'], definition: 'NM_000110.4:c.2279C>T', type: 'variant', guideline: 'dpyd' },
  { gene: 'UGT1A1', name: '*6', rsIds: ['rs4148323'], definition: 'c.211G>A', type: 'variant', guideline: 'ugt1a1' },
  { gene: 'UGT1A1', name: '*28', rsIds: ['rs8175347'], definition: 'A(TA)₇TAA', type: 'repeat', guideline: 'ugt1a1' },
  { gene: 'TPMT', name: '*2', rsIds: ['rs1800462'], definition: 'c.238G>C', type: 'variant', guideline: 'thiopurines', definitionUrl: 'https://www.pharmvar.org/gene/TPMT' },
  { gene: 'TPMT', name: '*3A', rsIds: ['rs1800460', 'rs1142345'], definition: 'c.[460G>A;719A>G]', type: 'haplotype', guideline: 'thiopurines', definitionUrl: 'https://www.pharmvar.org/gene/TPMT' },
  { gene: 'TPMT', name: '*3B', rsIds: ['rs1800460'], definition: 'c.460G>A', type: 'variant', guideline: 'thiopurines', definitionUrl: 'https://www.pharmvar.org/gene/TPMT' },
  { gene: 'TPMT', name: '*3C', rsIds: ['rs1142345'], definition: 'c.719A>G', type: 'variant', guideline: 'thiopurines', definitionUrl: 'https://www.pharmvar.org/gene/TPMT' },
  { gene: 'NUDT15', name: '*3', rsIds: ['rs116855232'], definition: 'c.415C>T', type: 'variant', guideline: 'thiopurines', definitionUrl: 'https://www.clinpgx.org/page/nudt15RefMaterials' },
];

export function chemotherapyMarkerId(marker: ReferenceMarker) {
  return [marker.gene, marker.name, marker.type].join(':');
}
