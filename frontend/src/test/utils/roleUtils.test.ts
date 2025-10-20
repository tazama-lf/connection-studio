import {
  hasRole,
  isApprover,
  isEditor,
  isPublisher,
  getPrimaryRole,
  getRoleDisplayInfo,
  type UserRole,
} from '../../utils/roleUtils';

describe('roleUtils', () => {
  describe('hasRole', () => {
    it('should return true when user has the specified role', () => {
      const userClaims = ['editor', 'approver'];
      expect(hasRole(userClaims, 'editor')).toBe(true);
      expect(hasRole(userClaims, 'approver')).toBe(true);
    });

    it('should return false when user does not have the specified role', () => {
      const userClaims = ['editor'];
      expect(hasRole(userClaims, 'approver')).toBe(false);
      expect(hasRole(userClaims, 'publisher')).toBe(false);
    });

    it('should return false for empty claims array', () => {
      const userClaims: string[] = [];
      expect(hasRole(userClaims, 'editor')).toBe(false);
    });
  });

  describe('isApprover', () => {
    it('should return true when user has approver role', () => {
      const userClaims = ['editor', 'approver'];
      expect(isApprover(userClaims)).toBe(true);
    });

    it('should return false when user does not have approver role', () => {
      const userClaims = ['editor', 'publisher'];
      expect(isApprover(userClaims)).toBe(false);
    });
  });

  describe('isEditor', () => {
    it('should return true when user has editor role', () => {
      const userClaims = ['editor', 'approver'];
      expect(isEditor(userClaims)).toBe(true);
    });

    it('should return false when user does not have editor role', () => {
      const userClaims = ['approver', 'publisher'];
      expect(isEditor(userClaims)).toBe(false);
    });
  });

  describe('isPublisher', () => {
    it('should return true when user has publisher role', () => {
      const userClaims = ['editor', 'publisher'];
      expect(isPublisher(userClaims)).toBe(true);
    });

    it('should return false when user does not have publisher role', () => {
      const userClaims = ['editor', 'approver'];
      expect(isPublisher(userClaims)).toBe(false);
    });
  });

  describe('getPrimaryRole', () => {
    it('should return publisher as primary role when user has publisher role', () => {
      const userClaims = ['editor', 'approver', 'publisher'];
      expect(getPrimaryRole(userClaims)).toBe('publisher');
    });

    it('should return approver as primary role when user has approver but not publisher', () => {
      const userClaims = ['editor', 'approver'];
      expect(getPrimaryRole(userClaims)).toBe('approver');
    });

    it('should return editor as primary role when user only has editor role', () => {
      const userClaims = ['editor'];
      expect(getPrimaryRole(userClaims)).toBe('editor');
    });

    it('should return null when user has no recognized roles', () => {
      const userClaims = ['admin', 'user'];
      expect(getPrimaryRole(userClaims)).toBe(null);
    });

    it('should return null for empty claims array', () => {
      const userClaims: string[] = [];
      expect(getPrimaryRole(userClaims)).toBe(null);
    });

    it('should prioritize publisher over approver and editor', () => {
      const userClaims = ['editor', 'approver', 'publisher'];
      expect(getPrimaryRole(userClaims)).toBe('publisher');
    });

    it('should prioritize approver over editor', () => {
      const userClaims = ['editor', 'approver'];
      expect(getPrimaryRole(userClaims)).toBe('approver');
    });
  });

  describe('getRoleDisplayInfo', () => {
    it('should return correct display info for approver role', () => {
      const result = getRoleDisplayInfo('approver');
      expect(result).toEqual({
        label: 'Approver',
        color: 'bg-blue-100 text-blue-800',
        description: 'Approve and manage endpoint configurations',
      });
    });

    it('should return correct display info for editor role', () => {
      const result = getRoleDisplayInfo('editor');
      expect(result).toEqual({
        label: 'Editor',
        color: 'bg-green-100 text-green-800',
        description: 'Create and edit endpoint configurations',
      });
    });

    it('should return correct display info for publisher role', () => {
      const result = getRoleDisplayInfo('publisher');
      expect(result).toEqual({
        label: 'Publisher',
        color: 'bg-purple-100 text-purple-800',
        description: 'Publish and deploy approved configurations',
      });
    });

    it('should handle all valid UserRole values', () => {
      const roles: UserRole[] = ['editor', 'approver', 'publisher'];

      roles.forEach((role) => {
        const result = getRoleDisplayInfo(role);
        expect(result).toHaveProperty('label');
        expect(result).toHaveProperty('color');
        expect(result).toHaveProperty('description');
        expect(typeof result.label).toBe('string');
        expect(typeof result.color).toBe('string');
        expect(typeof result.description).toBe('string');
      });
    });
  });
});