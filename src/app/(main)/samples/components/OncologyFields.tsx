'use client';

import { useId, useState } from 'react';
import { Input } from '@schema/ui-kit';
import { useText } from '@/i18n/useText';
import { cancerTypes, sampleTypes } from '@/lib/oncology-sample-options';
import type { OncologySampleFields } from '../types';

const customOption = 'custom';
const labelClass = 'mb-1.5 block text-xs font-medium text-fg-muted';

function PresetField({ label, options, value, onChange, maxLength, disabled }: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  disabled?: boolean;
}) {
  const t = useText();
  const id = useId();
  const [editingCustom, setEditingCustom] = useState(false);
  const presetIndex = options.indexOf(value);
  const isCustom = editingCustom || (!!value && presetIndex < 0);
  return <div>
    <label htmlFor={id} className={labelClass}>{label}</label>
    <select id={id} disabled={disabled}
      className="h-9 w-full rounded-md border border-border-default bg-canvas-default px-3 text-sm text-fg-default"
      value={isCustom ? customOption : presetIndex < 0 ? '' : String(presetIndex)}
      onChange={event => {
        const next = event.target.value;
        setEditingCustom(next === customOption);
        onChange(next === '' || next === customOption ? '' : options[Number(next)]);
      }}>
      <option value="">{t('oncologySample.select')}</option>
      {options.map((option, index) => <option key={option} value={index}>{t(option)}</option>)}
      <option value={customOption}>{t('oncologySample.custom')}</option>
    </select>
    {isCustom && <div className="mt-2">
      <Input aria-label={t('oncologySample.customField', { label })} placeholder={t('oncologySample.customField', { label })}
        value={value} onChange={event => onChange(event.target.value)} maxLength={maxLength} disabled={disabled} />
    </div>}
  </div>;
}

export function SampleTypeField({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const t = useText();
  return <PresetField label={t('samples.sampleType686c81')} options={sampleTypes} value={value} onChange={onChange} maxLength={20} disabled={disabled} />;
}

export function OncologyFields({ value, onChange, disabled }: {
  value: Pick<OncologySampleFields, 'cancerType' | 'collectionSite'>;
  onChange: (changes: Pick<OncologySampleFields, 'cancerType' | 'collectionSite'>) => void;
  disabled?: boolean;
}) {
  const t = useText();
  const siteId = useId();
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <PresetField label={t('oncologySample.cancerType')} options={cancerTypes} value={value.cancerType ?? ''}
      onChange={cancerType => onChange({ cancerType })} maxLength={100} disabled={disabled} />
    <div>
      <label htmlFor={siteId} className={labelClass}>{t('oncologySample.collectionSiteOptional')}</label>
      <Input id={siteId} value={value.collectionSite ?? ''} placeholder={t('oncologySample.collectionSiteExample')}
        onChange={event => onChange({ collectionSite: event.target.value })} maxLength={100} disabled={disabled} />
    </div>
  </div>;
}
