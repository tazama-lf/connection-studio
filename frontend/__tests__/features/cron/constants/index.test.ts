import {
  CRON_JOB_FORM_DEFAULTS,
  CRON_JOB_EDIT_FORM_DEFAULTS,
  CRON_JOB_ERROR_MESSAGES,
  CRON_JOB_SUCCESS_MESSAGES,
  CRON_JOB_STATUSES,
} from '@/features/cron/constants';

describe('features/cron/constants/index.ts', () => {
  it('contains expected form default values', () => {
    expect(CRON_JOB_FORM_DEFAULTS).toEqual({
      name: '',
      cronExpression: '',
      iterations: 1,
    });

    expect(CRON_JOB_EDIT_FORM_DEFAULTS.id).toBe('');
    expect(CRON_JOB_EDIT_FORM_DEFAULTS.iterations).toBe(1);
    expect(CRON_JOB_EDIT_FORM_DEFAULTS.schedule_status).toBe('');
  });

  it('builds success messages and exposes status values', () => {
    expect(CRON_JOB_SUCCESS_MESSAGES.CREATED('Daily Sync')).toBe(
      'Schedule "Daily Sync" created successfully!',
    );
    expect(CRON_JOB_SUCCESS_MESSAGES.EXPORTED).toContain('exported');

    expect(CRON_JOB_STATUSES.IN_PROGRESS).toBe('STATUS_01_IN_PROGRESS');
    expect(CRON_JOB_STATUSES.APPROVED).toBe('STATUS_04_APPROVED');
    expect(CRON_JOB_STATUSES.DEPLOYED).toBe('STATUS_08_DEPLOYED');
  });

  it('exposes user-facing error messages for key failure modes', () => {
    expect(CRON_JOB_ERROR_MESSAGES.INVALID_INPUT).toMatch(/invalid/i);
    expect(CRON_JOB_ERROR_MESSAGES.UNAUTHORIZED).toMatch(/permission/i);
    expect(CRON_JOB_ERROR_MESSAGES.NETWORK_ERROR).toMatch(/connect/i);
  });
});

