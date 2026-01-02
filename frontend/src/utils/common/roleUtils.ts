/**
 * Utility functions for role-based UI logic
 */

export type UserRole = 'editor' | 'approver' | 'publisher' | 'exporter';

/**
 * Check if user has a specific role
 */
export const hasRole = (userClaims: string[], role: UserRole): boolean =>
  userClaims.includes(role);

/**
 * Check if user is an approver
 */
export const isApprover = (userClaims: string[]): boolean =>
  hasRole(userClaims, 'approver');

/**
 * Check if user is an editor
 */
export const isEditor = (userClaims: string[]): boolean =>
  hasRole(userClaims, 'editor');

/**
 * Check if user is a publisher
 */
export const isPublisher = (userClaims: string[]): boolean =>
  hasRole(userClaims, 'publisher');

/**
 * Check if user is an exporter
 */
export const isExporter = (userClaims: string[]): boolean =>
  hasRole(userClaims, 'exporter');

/**
 * Get the primary role for display purposes
 */
export const getPrimaryRole = (userClaims: string[]): UserRole | null => {
  if (isPublisher(userClaims)) return 'publisher';
  if (isExporter(userClaims)) return 'exporter';
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
    exporter: {
      label: 'Exporter',
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Export data and configurations',
    },
  };

  return roleConfig[role];
};
