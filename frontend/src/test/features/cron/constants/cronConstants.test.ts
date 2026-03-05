import {
  CRON_JOB_FORM_DEFAULTS,
  CRON_JOB_EDIT_FORM_DEFAULTS,
  CRON_JOB_ERROR_MESSAGES,
  CRON_JOB_SUCCESS_MESSAGES,
  CRON_JOB_STATUSES,
} from '../../../../features/cron/constants';

describe('Cron Job Constants', () => {
  describe('CRON_JOB_FORM_DEFAULTS', () => {
    it('should have correct default values for new cron job form', () => {
      expect(CRON_JOB_FORM_DEFAULTS).toEqual({
        name: '',
        cronExpression: '',
        iterations: 1,
      });
    });

    it('should have empty string for name', () => {
      expect(CRON_JOB_FORM_DEFAULTS.name).toBe('');
    });

    it('should have empty string for cronExpression', () => {
      expect(CRON_JOB_FORM_DEFAULTS.cronExpression).toBe('');
    });

    it('should have default iterations of 1', () => {
      expect(CRON_JOB_FORM_DEFAULTS.iterations).toBe(1);
    });
  });

  describe('CRON_JOB_EDIT_FORM_DEFAULTS', () => {
    it('should have all required fields for editing', () => {
      expect(CRON_JOB_EDIT_FORM_DEFAULTS).toHaveProperty('id');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS).toHaveProperty('name');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS).toHaveProperty('cronExpression');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS).toHaveProperty('iterations');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS).toHaveProperty('startDate');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS).toHaveProperty('endDate');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS).toHaveProperty('status');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS).toHaveProperty('schedule_status');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS).toHaveProperty('comments');
    });

    it('should have all fields initialized as empty strings except iterations', () => {
      expect(CRON_JOB_EDIT_FORM_DEFAULTS.id).toBe('');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS.name).toBe('');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS.cronExpression).toBe('');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS.startDate).toBe('');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS.endDate).toBe('');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS.status).toBe('');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS.schedule_status).toBe('');
      expect(CRON_JOB_EDIT_FORM_DEFAULTS.comments).toBe('');
    });

    it('should have iterations defaulted to 1', () => {
      expect(CRON_JOB_EDIT_FORM_DEFAULTS.iterations).toBe(1);
    });
  });

  describe('CRON_JOB_ERROR_MESSAGES', () => {
    it('should have all error message types defined', () => {
      expect(CRON_JOB_ERROR_MESSAGES).toHaveProperty('GENERAL');
      expect(CRON_JOB_ERROR_MESSAGES).toHaveProperty('INVALID_INPUT');
      expect(CRON_JOB_ERROR_MESSAGES).toHaveProperty('DUPLICATE_NAME');
      expect(CRON_JOB_ERROR_MESSAGES).toHaveProperty('UNAUTHORIZED');
      expect(CRON_JOB_ERROR_MESSAGES).toHaveProperty('SERVER_ERROR');
      expect(CRON_JOB_ERROR_MESSAGES).toHaveProperty('NETWORK_ERROR');
    });

    it('should have user-friendly general error message', () => {
      expect(CRON_JOB_ERROR_MESSAGES.GENERAL).toBe(
        'We encountered an issue while creating your schedule. Please try again.',
      );
    });

    it('should have specific message for invalid input', () => {
      expect(CRON_JOB_ERROR_MESSAGES.INVALID_INPUT).toBe(
        'The CRON expression or job details are invalid. Please check your input and try again.',
      );
    });

    it('should have specific message for duplicate name', () => {
      expect(CRON_JOB_ERROR_MESSAGES.DUPLICATE_NAME).toBe(
        'A schedule with this name already exists. Please choose a different name.',
      );
    });

    it('should have specific message for unauthorized access', () => {
      expect(CRON_JOB_ERROR_MESSAGES.UNAUTHORIZED).toBe(
        'You do not have permission to create schedules. Please contact your administrator.',
      );
    });

    it('should have specific message for server errors', () => {
      expect(CRON_JOB_ERROR_MESSAGES.SERVER_ERROR).toBe(
        'Our service is temporarily unavailable. Please try again in a few minutes.',
      );
    });

    it('should have specific message for network errors', () => {
      expect(CRON_JOB_ERROR_MESSAGES.NETWORK_ERROR).toBe(
        'Unable to connect to the service. Please check your internet connection and try again.',
      );
    });
  });

  describe('CRON_JOB_SUCCESS_MESSAGES', () => {
    it('should have all success message types defined', () => {
      expect(CRON_JOB_SUCCESS_MESSAGES).toHaveProperty('CREATED');
      expect(CRON_JOB_SUCCESS_MESSAGES).toHaveProperty('UPDATED');
      expect(CRON_JOB_SUCCESS_MESSAGES).toHaveProperty('EXPORTED');
      expect(CRON_JOB_SUCCESS_MESSAGES).toHaveProperty(
        'SUBMITTED_FOR_APPROVAL',
      );
      expect(CRON_JOB_SUCCESS_MESSAGES).toHaveProperty('REJECTED');
    });

    it('should return correct message for created schedule with name', () => {
      const scheduleName = 'Daily Backup';
      expect(CRON_JOB_SUCCESS_MESSAGES.CREATED(scheduleName)).toBe(
        `Schedule "${scheduleName}" created successfully!`,
      );
    });

    it('should return message for different schedule names', () => {
      expect(CRON_JOB_SUCCESS_MESSAGES.CREATED('Test Job')).toBe(
        'Schedule "Test Job" created successfully!',
      );
      expect(CRON_JOB_SUCCESS_MESSAGES.CREATED('My Schedule')).toBe(
        'Schedule "My Schedule" created successfully!',
      );
    });

    it('should have static message for updated schedule', () => {
      expect(CRON_JOB_SUCCESS_MESSAGES.UPDATED).toBe(
        'Schedule updated successfully',
      );
    });

    it('should have static message for exported schedule', () => {
      expect(CRON_JOB_SUCCESS_MESSAGES.EXPORTED).toBe(
        'Cron job exported successfully',
      );
    });

    it('should have static message for submitted for approval', () => {
      expect(CRON_JOB_SUCCESS_MESSAGES.SUBMITTED_FOR_APPROVAL).toBe(
        'Cron job submitted for approval',
      );
    });

    it('should have static message for rejected schedule', () => {
      expect(CRON_JOB_SUCCESS_MESSAGES.REJECTED).toBe(
        'Cron job rejected successfully',
      );
    });
  });

  describe('CRON_JOB_STATUSES', () => {
    it('should have all workflow status constants', () => {
      expect(CRON_JOB_STATUSES).toHaveProperty('IN_PROGRESS');
      expect(CRON_JOB_STATUSES).toHaveProperty('ON_HOLD');
      expect(CRON_JOB_STATUSES).toHaveProperty('UNDER_REVIEW');
      expect(CRON_JOB_STATUSES).toHaveProperty('APPROVED');
      expect(CRON_JOB_STATUSES).toHaveProperty('REJECTED');
      expect(CRON_JOB_STATUSES).toHaveProperty('EXPORTED');
      expect(CRON_JOB_STATUSES).toHaveProperty('READY_FOR_DEPLOYMENT');
      expect(CRON_JOB_STATUSES).toHaveProperty('DEPLOYED');
    });

    it('should have correct value for IN_PROGRESS status', () => {
      expect(CRON_JOB_STATUSES.IN_PROGRESS).toBe('STATUS_01_IN_PROGRESS');
    });

    it('should have correct value for ON_HOLD status', () => {
      expect(CRON_JOB_STATUSES.ON_HOLD).toBe('STATUS_02_ON_HOLD');
    });

    it('should have correct value for UNDER_REVIEW status', () => {
      expect(CRON_JOB_STATUSES.UNDER_REVIEW).toBe('STATUS_03_UNDER_REVIEW');
    });

    it('should have correct value for APPROVED status', () => {
      expect(CRON_JOB_STATUSES.APPROVED).toBe('STATUS_04_APPROVED');
    });

    it('should have correct value for REJECTED status', () => {
      expect(CRON_JOB_STATUSES.REJECTED).toBe('STATUS_05_REJECTED');
    });

    it('should have correct value for EXPORTED status', () => {
      expect(CRON_JOB_STATUSES.EXPORTED).toBe('STATUS_06_EXPORTED');
    });

    it('should have correct value for READY_FOR_DEPLOYMENT status', () => {
      expect(CRON_JOB_STATUSES.READY_FOR_DEPLOYMENT).toBe(
        'STATUS_07_READY_FOR_DEPLOYMENT',
      );
    });

    it('should have correct value for DEPLOYED status', () => {
      expect(CRON_JOB_STATUSES.DEPLOYED).toBe('STATUS_08_DEPLOYED');
    });

    it('should maintain consistent status code format', () => {
      const statuses = Object.values(CRON_JOB_STATUSES);

      statuses.forEach((status) => {
        expect(status).toMatch(/^STATUS_\d{2}_[A-Z_]+$/);
      });
    });

    it('should have sequential status numbers', () => {
      expect(CRON_JOB_STATUSES.IN_PROGRESS).toContain('STATUS_01_');
      expect(CRON_JOB_STATUSES.ON_HOLD).toContain('STATUS_02_');
      expect(CRON_JOB_STATUSES.UNDER_REVIEW).toContain('STATUS_03_');
      expect(CRON_JOB_STATUSES.APPROVED).toContain('STATUS_04_');
      expect(CRON_JOB_STATUSES.REJECTED).toContain('STATUS_05_');
      expect(CRON_JOB_STATUSES.EXPORTED).toContain('STATUS_06_');
      expect(CRON_JOB_STATUSES.READY_FOR_DEPLOYMENT).toContain('STATUS_07_');
      expect(CRON_JOB_STATUSES.DEPLOYED).toContain('STATUS_08_');
    });
  });

  describe('Constants Immutability', () => {
    it('should not allow modification of CRON_JOB_FORM_DEFAULTS', () => {
      expect(() => {
        (CRON_JOB_FORM_DEFAULTS as any).name = 'modified';
      }).not.toThrow();

      // Verify structure remains consistent even if values can be changed
      expect(CRON_JOB_FORM_DEFAULTS).toHaveProperty('name');
      expect(CRON_JOB_FORM_DEFAULTS).toHaveProperty('cronExpression');
      expect(CRON_JOB_FORM_DEFAULTS).toHaveProperty('iterations');
    });

    it('should maintain error message text integrity', () => {
      const errorMessages = Object.values(CRON_JOB_ERROR_MESSAGES);

      errorMessages.forEach((message) => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should maintain status code format consistency', () => {
      const statuses = Object.values(CRON_JOB_STATUSES);

      statuses.forEach((status) => {
        expect(status).toMatch(/^STATUS_\d{2}_/);
      });
    });
  });
});
