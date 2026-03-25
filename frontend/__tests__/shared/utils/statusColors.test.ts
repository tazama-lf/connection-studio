import {
  getStatusColor,
  getStatusLabel,
  normalizeStatus,
  isStatus,
  getJobTypeColor,
} from '../../../src/shared/utils/statusColors';

describe('statusColors', () => {
  describe('getStatusColor', () => {
    it('should return gray for undefined', () => {
      expect(getStatusColor(undefined)).toBe('bg-gray-100 text-gray-800');
    });

    it('should return gray for empty string', () => {
      expect(getStatusColor('')).toBe('bg-gray-100 text-gray-800');
    });

    // STATUS_XX_NAME format
    it('should return blue for STATUS_01_IN_PROGRESS', () => {
      expect(getStatusColor('STATUS_01_IN_PROGRESS')).toBe('bg-blue-100 text-blue-800');
    });

    it('should return yellow for STATUS_03_UNDER_REVIEW', () => {
      expect(getStatusColor('STATUS_03_UNDER_REVIEW')).toBe('bg-yellow-100 text-yellow-800');
    });

    it('should return green for STATUS_04_APPROVED', () => {
      expect(getStatusColor('STATUS_04_APPROVED')).toBe('bg-green-100 text-green-800');
    });

    it('should return red for STATUS_05_REJECTED', () => {
      expect(getStatusColor('STATUS_05_REJECTED')).toBe('bg-red-100 text-red-800');
    });

    it('should return indigo for STATUS_06_EXPORTED', () => {
      expect(getStatusColor('STATUS_06_EXPORTED')).toBe('bg-indigo-100 text-indigo-800');
    });

    it('should return teal for STATUS_08_DEPLOYED', () => {
      expect(getStatusColor('STATUS_08_DEPLOYED')).toBe('bg-teal-100 text-teal-800');
    });

    it('should return orange for suspended', () => {
      expect(getStatusColor('suspended')).toBe('bg-orange-100 text-orange-800');
    });

    it('should return blue for in_progress', () => {
      expect(getStatusColor('in_progress')).toBe('bg-blue-100 text-blue-800');
    });

    it('should return blue for in progress', () => {
      expect(getStatusColor('in progress')).toBe('bg-blue-100 text-blue-800');
    });

    it('should return blue for draft', () => {
      expect(getStatusColor('draft')).toBe('bg-blue-100 text-blue-800');
    });

    it('should return yellow for under_review', () => {
      expect(getStatusColor('under_review')).toBe('bg-yellow-100 text-yellow-800');
    });

    it('should return yellow for under review', () => {
      expect(getStatusColor('under review')).toBe('bg-yellow-100 text-yellow-800');
    });

    it('should return yellow for pending', () => {
      expect(getStatusColor('pending')).toBe('bg-yellow-100 text-yellow-800');
    });

    it('should return yellow for pending_approval', () => {
      expect(getStatusColor('pending_approval')).toBe('bg-yellow-100 text-yellow-800');
    });

    it('should return yellow for pending approval', () => {
      expect(getStatusColor('pending approval')).toBe('bg-yellow-100 text-yellow-800');
    });

    it('should return green for approved', () => {
      expect(getStatusColor('approved')).toBe('bg-green-100 text-green-800');
    });

    it('should return green for active', () => {
      expect(getStatusColor('active')).toBe('bg-green-100 text-green-800');
    });

    it('should return red for rejected', () => {
      expect(getStatusColor('rejected')).toBe('bg-red-100 text-red-800');
    });

    it('should return red for failed', () => {
      expect(getStatusColor('failed')).toBe('bg-red-100 text-red-800');
    });

    it('should return indigo for exported', () => {
      expect(getStatusColor('exported')).toBe('bg-indigo-100 text-indigo-800');
    });

    it('should return indigo for ready_for_deployment', () => {
      expect(getStatusColor('ready_for_deployment')).toBe('bg-indigo-100 text-indigo-800');
    });

    it('should return indigo for ready for deployment', () => {
      expect(getStatusColor('ready for deployment')).toBe('bg-indigo-100 text-indigo-800');
    });

    it('should return indigo for ready', () => {
      expect(getStatusColor('ready')).toBe('bg-indigo-100 text-indigo-800');
    });

    it('should return teal for deployed', () => {
      expect(getStatusColor('deployed')).toBe('bg-teal-100 text-teal-800');
    });

    it('should return teal for published', () => {
      expect(getStatusColor('published')).toBe('bg-teal-100 text-teal-800');
    });

    it('should return purple for changes_requested', () => {
      expect(getStatusColor('changes_requested')).toBe('bg-purple-100 text-purple-800');
    });

    it('should return purple for changes requested', () => {
      expect(getStatusColor('changes requested')).toBe('bg-purple-100 text-purple-800');
    });

    it('should return gray for in-active', () => {
      expect(getStatusColor('in-active')).toBe('bg-gray-100 text-gray-800');
    });

    it('should return gray for inactive', () => {
      expect(getStatusColor('inactive')).toBe('bg-gray-100 text-gray-800');
    });

    it('should return gray for disabled', () => {
      expect(getStatusColor('disabled')).toBe('bg-gray-100 text-gray-800');
    });

    it('should return gray for unknown status', () => {
      expect(getStatusColor('some_unknown')).toBe('bg-gray-100 text-gray-800');
    });

    it('should trim whitespace from status', () => {
      expect(getStatusColor('  approved  ')).toBe('bg-green-100 text-green-800');
    });

    it('should fallback to gray for malformed STATUS prefix without name segment', () => {
      expect(getStatusColor('STATUS_01')).toBe('bg-gray-100 text-gray-800');
    });
  });

  describe('getStatusLabel', () => {
    it('should return UNKNOWN for undefined', () => {
      expect(getStatusLabel(undefined)).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for empty string', () => {
      expect(getStatusLabel('')).toBe('UNKNOWN');
    });

    it('should return IN PROGRESS for in_progress', () => {
      expect(getStatusLabel('in_progress')).toBe('IN PROGRESS');
    });

    it('should return IN PROGRESS for in progress', () => {
      expect(getStatusLabel('in progress')).toBe('IN PROGRESS');
    });

    it('should return IN PROGRESS for STATUS_01_IN_PROGRESS', () => {
      expect(getStatusLabel('STATUS_01_IN_PROGRESS')).toBe('IN PROGRESS');
    });

    it('should return SUSPENDED for suspended', () => {
      expect(getStatusLabel('suspended')).toBe('SUSPENDED');
    });

    it('should return UNDER REVIEW for under_review', () => {
      expect(getStatusLabel('under_review')).toBe('UNDER REVIEW');
    });

    it('should return UNDER REVIEW for under review', () => {
      expect(getStatusLabel('under review')).toBe('UNDER REVIEW');
    });

    it('should return PENDING APPROVAL for pending_approval', () => {
      expect(getStatusLabel('pending_approval')).toBe('PENDING APPROVAL');
    });

    it('should return PENDING APPROVAL for pending approval', () => {
      expect(getStatusLabel('pending approval')).toBe('PENDING APPROVAL');
    });

    it('should return APPROVED for approved', () => {
      expect(getStatusLabel('approved')).toBe('APPROVED');
    });

    it('should return REJECTED for rejected', () => {
      expect(getStatusLabel('rejected')).toBe('REJECTED');
    });

    it('should return READY FOR DEPLOYMENT for exported', () => {
      expect(getStatusLabel('exported')).toBe('READY FOR DEPLOYMENT');
    });

    it('should return READY FOR DEPLOYMENT for ready_for_deployment', () => {
      expect(getStatusLabel('ready_for_deployment')).toBe('READY FOR DEPLOYMENT');
    });

    it('should return READY FOR DEPLOYMENT for ready for deployment', () => {
      expect(getStatusLabel('ready for deployment')).toBe('READY FOR DEPLOYMENT');
    });

    it('should return READY FOR DEPLOYMENT for ready', () => {
      expect(getStatusLabel('ready')).toBe('READY FOR DEPLOYMENT');
    });

    it('should return DEPLOYED for deployed', () => {
      expect(getStatusLabel('deployed')).toBe('DEPLOYED');
    });

    it('should return CHANGES REQUESTED for changes_requested', () => {
      expect(getStatusLabel('changes_requested')).toBe('CHANGES REQUESTED');
    });

    it('should return CHANGES REQUESTED for changes requested', () => {
      expect(getStatusLabel('changes requested')).toBe('CHANGES REQUESTED');
    });

    it('should return INACTIVE for in-active', () => {
      expect(getStatusLabel('in-active')).toBe('INACTIVE');
    });

    it('should return INACTIVE for inactive', () => {
      expect(getStatusLabel('inactive')).toBe('INACTIVE');
    });

    it('should return uppercased status for unknown', () => {
      expect(getStatusLabel('custom_status')).toBe('CUSTOM_STATUS');
    });

    it('should keep malformed STATUS prefix label uppercased', () => {
      expect(getStatusLabel('STATUS_01')).toBe('STATUS_01');
    });
  });

  describe('normalizeStatus', () => {
    it('should return empty string for undefined', () => {
      expect(normalizeStatus(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(normalizeStatus('')).toBe('');
    });

    it('should extract name from STATUS_01_IN_PROGRESS format', () => {
      expect(normalizeStatus('STATUS_01_IN_PROGRESS')).toBe('in_progress');
    });

    it('should extract name from STATUS_04_APPROVED format', () => {
      expect(normalizeStatus('STATUS_04_APPROVED')).toBe('approved');
    });

    it('should return the status as-is if not STATUS_XX format', () => {
      expect(normalizeStatus('approved')).toBe('approved');
    });

    it('should handle multi-word status names in STATUS format', () => {
      expect(normalizeStatus('STATUS_03_UNDER_REVIEW')).toBe('under_review');
    });

    it('should keep malformed STATUS prefix unchanged after normalization', () => {
      expect(normalizeStatus('STATUS_01')).toBe('status_01');
    });
  });

  describe('isStatus', () => {
    it('returns true for exact match', () => {
      expect(isStatus('approved', 'approved')).toBe(true);
    });

    it('returns false for non-match', () => {
      expect(isStatus('approved', 'rejected')).toBe(false);
    });
  });

  describe('getJobTypeColor', () => {
    it('returns gray for undefined', () => {
      expect(getJobTypeColor(undefined)).toBe('bg-gray-100 text-gray-700');
    });

    it('returns purple for push', () => {
      expect(getJobTypeColor('push')).toBe('bg-purple-100 text-purple-700');
    });

    it('returns blue for pull', () => {
      expect(getJobTypeColor('pull')).toBe('bg-blue-100 text-blue-700');
    });

    it('returns gray for unknown type', () => {
      expect(getJobTypeColor('other')).toBe('bg-gray-100 text-gray-700');
    });
  });
});
