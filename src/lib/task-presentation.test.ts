import { describe, expect, it } from 'vitest';
import { taskDisplayStatus } from './task-presentation';

describe('taskDisplayStatus', () => {
  it('prefers interpretation completion over the raw status', () => {
    expect(taskDisplayStatus({ status: 'pending_interpretation', interpretationCompletedAt: '2026-01-01', template: 'somatic' })).toBe('interpretation_completed');
  });

  it('surfaces a failed result import', () => {
    expect(taskDisplayStatus({ status: 'completed', resultImportStatus: 'failed', template: 'somatic' })).toBe('import_failed');
  });

  it('keeps baseline resources out of interpretation states', () => {
    expect(taskDisplayStatus({ status: 'completed', resultImportStatus: 'failed', template: 'baseline_fix' })).toBe('completed');
  });
});
