import { getStatusBadge } from '../../src/utils/common/functions';

describe('getStatusBadge', () => {
  describe('STATUS_XX_NAME format', () => {
    it('should fallback to gray when STATUS_ prefix has no status name segment', () => {
      expect(getStatusBadge('STATUS_01')).toBe(
        'bg-gray-50 text-gray-600 border border-gray-200',
      );
    });

    it('should return yellow classes for STATUS_01_IN_PROGRESS', () => {
      expect(getStatusBadge('STATUS_01_IN_PROGRESS')).toBe(
        'bg-yellow-50 text-yellow-600 border border-yellow-200',
      );
    });

    it('should be case insensitive for STATUS format', () => {
      expect(getStatusBadge('status_01_in_progress')).toBe(
        'bg-yellow-50 text-yellow-600 border border-yellow-200',
      );
    });

    it('should return blue classes for STATUS_03_UNDER_REVIEW', () => {
      expect(getStatusBadge('STATUS_03_UNDER_REVIEW')).toBe(
        'bg-blue-50 text-blue-600 border border-blue-200',
      );
    });

    it('should return green classes for STATUS_04_APPROVED', () => {
      expect(getStatusBadge('STATUS_04_APPROVED')).toBe(
        'bg-green-50 text-green-600 border border-green-200',
      );
    });

    it('should return red classes for STATUS_05_REJECTED', () => {
      expect(getStatusBadge('STATUS_05_REJECTED')).toBe(
        'bg-red-50 text-red-600 border border-red-200',
      );
    });

    it('should return cyan classes for STATUS_06_EXPORTED', () => {
      expect(getStatusBadge('STATUS_06_EXPORTED')).toBe(
        'bg-cyan-50 text-cyan-600 border border-cyan-200',
      );
    });

    it('should return orange classes for STATUS_XX_CHANGES_REQUESTED', () => {
      expect(getStatusBadge('STATUS_07_CHANGES_REQUESTED')).toBe(
        'bg-orange-50 text-orange-600 border border-orange-200',
      );
    });

    it('should return emerald classes for STATUS_XX_READY_FOR_DEPLOYMENT', () => {
      expect(getStatusBadge('STATUS_07_READY_FOR_DEPLOYMENT')).toBe(
        'bg-emerald-50 text-emerald-600 border border-emerald-200',
      );
    });

    it('should return indigo classes for STATUS_08_DEPLOYED', () => {
      expect(getStatusBadge('STATUS_08_DEPLOYED')).toBe(
        'bg-indigo-50 text-indigo-600 border border-indigo-200',
      );
    });

    it('should return red classes for STATUS_XX_SUSPENDED', () => {
      expect(getStatusBadge('STATUS_09_SUSPENDED')).toBe(
        'bg-red-50 text-red-600 border border-red-200',
      );
    });

    it('should return gray classes for an unknown STATUS_XX format', () => {
      expect(getStatusBadge('STATUS_99_UNKNOWN')).toBe(
        'bg-gray-50 text-gray-600 border border-gray-200',
      );
    });
  });

  describe('legacy format', () => {
    it('should return green for "active"', () => {
      expect(getStatusBadge('active')).toBe(
        'bg-green-50 text-green-600 border border-green-200',
      );
    });

    it('should return green for "approved"', () => {
      expect(getStatusBadge('approved')).toBe(
        'bg-green-50 text-green-600 border border-green-200',
      );
    });

    it('should return green for "ready for approval"', () => {
      expect(getStatusBadge('ready for approval')).toBe(
        'bg-green-50 text-green-600 border border-green-200',
      );
    });

    it('should return yellow for "in-progress"', () => {
      expect(getStatusBadge('in-progress')).toBe(
        'bg-yellow-50 text-yellow-600 border border-yellow-200',
      );
    });

    it('should return yellow for "in_progress"', () => {
      expect(getStatusBadge('in_progress')).toBe(
        'bg-yellow-50 text-yellow-600 border border-yellow-200',
      );
    });

    it('should return yellow for "draft"', () => {
      expect(getStatusBadge('draft')).toBe(
        'bg-yellow-50 text-yellow-600 border border-yellow-200',
      );
    });

    it('should return red for "suspended"', () => {
      expect(getStatusBadge('suspended')).toBe(
        'bg-red-50 text-red-600 border border-red-200',
      );
    });

    it('should return red for "rejected"', () => {
      expect(getStatusBadge('rejected')).toBe(
        'bg-red-50 text-red-600 border border-red-200',
      );
    });

    it('should return purple for "cloned"', () => {
      expect(getStatusBadge('cloned')).toBe(
        'bg-purple-50 text-purple-600 border border-purple-200',
      );
    });

    it('should return blue for "under_review"', () => {
      expect(getStatusBadge('under_review')).toBe(
        'bg-blue-50 text-blue-600 border border-blue-200',
      );
    });

    it('should return blue for "under review"', () => {
      expect(getStatusBadge('under review')).toBe(
        'bg-blue-50 text-blue-600 border border-blue-200',
      );
    });

    it('should return indigo for "deployed"', () => {
      expect(getStatusBadge('deployed')).toBe(
        'bg-indigo-50 text-indigo-600 border border-indigo-200',
      );
    });

    it('should return orange for "changes_requested"', () => {
      expect(getStatusBadge('changes_requested')).toBe(
        'bg-orange-50 text-orange-600 border border-orange-200',
      );
    });

    it('should return orange for "changes requested"', () => {
      expect(getStatusBadge('changes requested')).toBe(
        'bg-orange-50 text-orange-600 border border-orange-200',
      );
    });

    it('should return cyan for "exported"', () => {
      expect(getStatusBadge('exported')).toBe(
        'bg-cyan-50 text-cyan-600 border border-cyan-200',
      );
    });

    it('should return emerald for "ready_for_deployment"', () => {
      expect(getStatusBadge('ready_for_deployment')).toBe(
        'bg-emerald-50 text-emerald-600 border border-emerald-200',
      );
    });

    it('should return emerald for "ready for deployment"', () => {
      expect(getStatusBadge('ready for deployment')).toBe(
        'bg-emerald-50 text-emerald-600 border border-emerald-200',
      );
    });

    it('should return gray for unknown status', () => {
      expect(getStatusBadge('some_unknown_status')).toBe(
        'bg-gray-50 text-gray-600 border border-gray-200',
      );
    });
  });
});
