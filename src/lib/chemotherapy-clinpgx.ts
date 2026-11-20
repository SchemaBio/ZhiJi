// Selected PharmGKB/ClinPGx clinical annotation identifiers and evidence levels.
// Source: clinicalAnnotations.zip, archive dated 2025-07-05. Selected and normalized
// for display; annotation prose is not included. CC BY-SA 4.0 applies to this extract.
export const clinpgxArchive = {
  source: 'https://api.clinpgx.org/v1/download/file/data/clinicalAnnotations.zip',
  license: 'https://creativecommons.org/licenses/by-sa/4.0/',
  date: '2025-07-05',
} as const;

const evidence = (id: string, level: '1A' | '1B' | '4', category: 'toxicity' | 'efficacy' = 'toxicity') => ({ id, level, category });
const fluoropyrimidines = {
  'rs3918290': [evidence('827843617', '1A'), evidence('1451274984', '1A'), evidence('1448640301', '4', 'efficacy')],
  'rs55886062': [evidence('1183630664', '1A'), evidence('1451276160', '1A')],
  'rs67376798': [evidence('981203618', '1A'), evidence('1451274090', '1A')],
  'rs75017182': [evidence('1184986174', '1A'), evidence('1451274165', '1A')],
  'rs56038477': [evidence('1447989784', '1A'), evidence('1451288269', '1A')],
  'rs115232898': [evidence('1183703784', '1A')],
} satisfies Record<string, ReturnType<typeof evidence>[]>;

const genotypeExamples: Record<string, { lower: string; elevated: string }> = {
  rs3918290: { lower: 'CC', elevated: 'CT / TT' },
  rs55886062: { lower: 'AA', elevated: 'AC / CC' },
  rs67376798: { lower: 'TT', elevated: 'AT / AA' },
  rs75017182: { lower: 'GG', elevated: 'CG / CC' },
  rs115232898: { lower: 'TT', elevated: 'CT / CC' },
};

export function chemotherapyClinpgxEvidence(gene: string, marker: string, rsId: string) {
  if (gene === 'DPYD' && Object.hasOwn(fluoropyrimidines, rsId)) {
    return fluoropyrimidines[rsId as keyof typeof fluoropyrimidines];
  }
  if (gene === 'UGT1A1') return marker === '*28'
    ? [evidence('1451204660', '1A'), evidence('1451215020', '1B')]
    : [evidence('1451329460', '1B'), evidence('1451215020', '1B')];
  if (gene === 'TPMT') return marker === '*3B'
    ? [evidence('1184648909', '1A')]
    : [evidence('1184648909', '1A'), evidence('1451748900', '1A')];
  if (gene === 'NUDT15') return [evidence('1451448820', '1A')];
  return [];
}

export function chemotherapyGenotypeExample(rsId: string) {
  return Object.hasOwn(genotypeExamples, rsId) ? genotypeExamples[rsId] : undefined;
}
