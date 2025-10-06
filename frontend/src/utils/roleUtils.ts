/**
 * Utility functions for role-based UI logic
 */

export type UserRole = 'editor' | 'approver' | 'publisher';

/**
 * Check if user has a specific role
 */
export const hasRole = (userClaims: string[], role: UserRole): boolean => {
  return userClaims.includes(role);
};

/**
 * Check if user is an approver
 */
export const isApprover = (userClaims: string[]): boolean => {
  return hasRole(userClaims, 'approver');
};

/**
 * Check if user is an editor
 */
export const isEditor = (userClaims: string[]): boolean => {
  return hasRole(userClaims, 'editor');
};

/**
 * Check if user is a publisher
 */
export const isPublisher = (userClaims: string[]): boolean => {
  return hasRole(userClaims, 'publisher');
};

/**
 * Get the primary role for display purposes (in order of precedence)
 */
export const getPrimaryRole = (userClaims: string[]): UserRole | null => {
  if (isPublisher(userClaims)) return 'publisher';
  if (isApprover(userClaims)) return 'approver';
  if (isEditor(userClaims)) return 'editor';
  return null;
};

/**
 * Get role display information
 */
export const getRoleDisplayInfo = (role: UserRole) => {
  const roleConfig = {
    approver: {
      label: 'Approver',
      color: 'bg-blue-100 text-blue-800',
      description: 'Approve and manage endpoint configurations',
    },
    editor: {
      label: 'Editor',
      color: 'bg-green-100 text-green-800',
      description: 'Create and edit endpoint configurations',
    },
    publisher: {
      label: 'Publisher',
      color: 'bg-purple-100 text-purple-800',
      description: 'Publish and deploy approved configurations',
    },
  };

  return roleConfig[role];
};
