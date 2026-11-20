'use client';
import { getRuntimeBackendFlavor } from '@/lib/runtime-config';
import { errorText } from '@/i18n/errors';

import { useText } from '@/i18n/useText';
import { localizeDisplay } from '@/i18n/text';

import { ActionButton as Button } from '@/components/shared/ActionButton';


import { SampleIdentityNotice } from '@/components/shared/ResearchPolicy';
import * as React from 'react';
import { Input, Select, TextArea } from '@schema/ui-kit';
import { FileText, Stethoscope, UserRound } from 'lucide-react';
import { AppModal, ModalSectionHeading } from '@/components/shared';
import { OncologyFields, SampleTypeField } from './OncologyFields';
import type { Gender, OncologySampleFields } from '../types';

interface NewSampleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewSampleFormData) => void | Promise<void>;
}

export interface NewSampleFormData extends OncologySampleFields {
  identityPolicyAcknowledged?: boolean;
  identityPolicyVersion?: string;
  internalId: string;
  gender: Gender;
  age?: number;
  batch: string;
  clinicalDiagnosis: string;
  remark: string;
}

const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' },
];

export function NewSampleModal({ isOpen, onClose, onSubmit }: NewSampleModalProps) {
  const t = useText();
  const requiresIdentityConfirmation = getRuntimeBackendFlavor() === 'onykia';
  const [formData, setFormData] = React.useState<NewSampleFormData>({
    internalId: '',
    gender: 'unknown',
    age: undefined,
    sampleType: '',
    cancerType: '',
    collectionSite: '',
    batch: '',
    clinicalDiagnosis: '',
    remark: '',
  });

  const [acknowledged, setAcknowledged] = React.useState(false);
  React.useEffect(() => { if (isOpen) setAcknowledged(false); }, [isOpen]);
  const [submitting, setSubmitting] = React.useState(false);
  const submittingRef = React.useRef(false);
  const [submitError, setSubmitError] = React.useState('');


  const handleChange = (field: keyof NewSampleFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (submitting || submittingRef.current) return;
    setSubmitError('');
    if (requiresIdentityConfirmation && !acknowledged) { setSubmitError(t('research.confirmRequired')); return; }

    if (!formData.internalId.trim()) {
      setSubmitError(t("samples.enterInternalIdbb323e"));
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        ...(requiresIdentityConfirmation ? { identityPolicyAcknowledged: acknowledged, identityPolicyVersion: "research-identity-v1" } : {}),
        internalId: formData.internalId.trim(),
      });
      onClose();
      // Reset form only after the backend confirms creation.
      setFormData({
        internalId: '',
        gender: 'unknown',
        age: undefined,
        sampleType: '',
        cancerType: '',
        collectionSite: '',
        batch: '',
        clinicalDiagnosis: '',
        remark: '',
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? errorText(err, t) : t("samples.unableToCreateSampleRetryLater8a8aa1"));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      open={isOpen}
      onOpenChange={(open) => !open && !submittingRef.current && onClose()}
      title={t("samples.newSample595c27")}
      size="large"
      className="!fixed !left-1/2 !right-auto !top-1/2 !bottom-auto !m-0 !max-h-[calc(100vh-2rem)] !w-[min(920px,calc(100vw-2rem))] !max-w-[920px] !-translate-x-1/2 !-translate-y-1/2"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t("admin.cancel4d0b46")}</Button>
          <Button action="add" loading={submitting} loadingLabel={t("pipeline.creating8c6348")} variant="primary" onClick={(e: React.MouseEvent) => handleSubmit(e)} disabled={submitting || (requiresIdentityConfirmation && !acknowledged)}>
            {t("samples.createSample6b316d")}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && (
          <div className="rounded-md border border-danger-muted bg-danger-subtle px-3 py-2 text-sm text-danger-fg">
            {submitError}
          </div>
        )}

        <section>
          {requiresIdentityConfirmation && <SampleIdentityNotice checked={acknowledged} onChange={setAcknowledged} />}
        <ModalSectionHeading
            icon={<UserRound className="h-4 w-4" />}
            title={t("samples.basicInformationb122f8")}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-muted">{t("samples.internalIdadcd0f")}</label>
              <Input
                value={formData.internalId}
                onChange={(e) => handleChange('internalId', e.target.value)}
                placeholder={t("samples.forExampleInt00b6e2")}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-muted">{t("samples.batch6b2cf2")}</label>
              <Input
                value={formData.batch}
                onChange={(e) => handleChange('batch', e.target.value)}
                placeholder={t("samples.forExampleBatch5e3179")}
              />
            </div>
            <SampleTypeField value={formData.sampleType} disabled={submitting}
              onChange={value => handleChange('sampleType', value)} />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-muted">{t("samples.sexfe8aa4")}</label>
              <Select
                value={formData.gender}
                onChange={(value) => handleChange('gender', Array.isArray(value) ? value[0] : value)}
                options={localizeDisplay(genderOptions, t)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg-muted">{t("samples.age28c02e")}</label>
              <Input
                type="number"
                min="0"
                max="150"
                value={formData.age ?? ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  age: e.target.value ? parseInt(e.target.value, 10) : undefined
                }))}
                placeholder={t("samples.forExamplec25a84")}
              />
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--yj-border-subtle)] pt-5">
          <ModalSectionHeading
            icon={<Stethoscope className="h-4 w-4" />}
            title={t("samples.clinicalInformation88e3af")}
          />
          <div className="space-y-4">
            <OncologyFields value={formData} disabled={submitting}
              onChange={changes => setFormData(previous => ({ ...previous, ...changes }))} />
            <label className="block text-xs font-medium text-fg-muted">
              <span className="mb-1.5 block">{t("oncologySample.clinicalDiagnosis")}</span>
              <TextArea value={formData.clinicalDiagnosis} disabled={submitting}
                onChange={event => handleChange('clinicalDiagnosis', event.target.value)} rows={2} />
            </label>
          </div>
        </section>

        <section className="border-t border-[var(--yj-border-subtle)] pt-5">
          <ModalSectionHeading
            icon={<FileText className="h-4 w-4" />}
            title={t("admin.notese03614")}
          />
          <TextArea
            value={formData.remark}
            onChange={(e) => handleChange('remark', e.target.value)}
            placeholder={t("samples.enterNotesacc063")}
            rows={2}
          />
        </section>
      </form>
    </AppModal>
  );
}
