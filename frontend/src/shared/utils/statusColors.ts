/**
 * Standardized status color mappings across all modules
 * This ensures consistent visual representation of statuses throughout the application
 */

export type JobWorkflowStatus =
  | 'in-progress'
  | 'under-review'
  | 'approved'
  | 'rejected'
  | 'exported'
  | 'ready-for-deployment'
  | 'deployed'
  | 'suspended';

export type ScheduleStatus = 'active' | 'in-active' | 'pending_approval';

const STATUS_PREFIX_PART_COUNT = 3;
const STATUS_NAME_START_INDEX = 2;

const extractStatusName = (status: string): string => {
  const normalizedStatus = status.toLowerCase().trim();
  if (normalizedStatus.startsWith('status_')) {
    const parts = normalizedStatus.split('_');
    if (parts.length >= STATUS_PREFIX_PART_COUNT) {
      return parts.slice(STATUS_NAME_START_INDEX).join('_');
    }
  }
  return normalizedStatus;
};

const DEFAULT_COLOR = 'bg-gray-100 text-gray-800';

const STATUS_COLOR_MAP: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-800',
  'in progress': 'bg-blue-100 text-blue-800',
  draft: 'bg-blue-100 text-blue-800',
  suspended: 'bg-orange-100 text-orange-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  'under review': 'bg-yellow-100 text-yellow-800',
  pending: 'bg-yellow-100 text-yellow-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  'pending approval': 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  active: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  exported: 'bg-indigo-100 text-indigo-800',
  ready_for_deployment: 'bg-indigo-100 text-indigo-800',
  'ready for deployment': 'bg-indigo-100 text-indigo-800',
  ready: 'bg-indigo-100 text-indigo-800',
  deployed: 'bg-teal-100 text-teal-800',
  published: 'bg-teal-100 text-teal-800',
  changes_requested: 'bg-purple-100 text-purple-800',
  'changes requested': 'bg-purple-100 text-purple-800',
  'in-active': DEFAULT_COLOR,
  inactive: DEFAULT_COLOR,
  disabled: DEFAULT_COLOR,
};

/**
 * Get standardized Tailwind CSS classes for workflow statuses
 * Used for configs, jobs, cron jobs, etc.
 */
export const getStatusColor = (status: string | undefined): string => {
  if (!status) return DEFAULT_COLOR;
  return STATUS_COLOR_MAP[extractStatusName(status)] ?? DEFAULT_COLOR;
};

const STATUS_LABEL_MAP: Record<string, string> = {
  in_progress: 'IN PROGRESS',
  'in progress': 'IN PROGRESS',
  suspended: 'SUSPENDED',
  under_review: 'UNDER REVIEW',
  'under review': 'UNDER REVIEW',
  pending_approval: 'PENDING APPROVAL',
  'pending approval': 'PENDING APPROVAL',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  exported: 'READY FOR DEPLOYMENT',
  ready_for_deployment: 'READY FOR DEPLOYMENT',
  'ready for deployment': 'READY FOR DEPLOYMENT',
  ready: 'READY FOR DEPLOYMENT',
  deployed: 'DEPLOYED',
  changes_requested: 'CHANGES REQUESTED',
  'changes requested': 'CHANGES REQUESTED',
  'in-active': 'INACTIVE',
  inactive: 'INACTIVE',
};

/**
 * Get human-readable status label
 */
export const getStatusLabel = (status: string | undefined): string => {
  if (!status) return 'UNKNOWN';
  return STATUS_LABEL_MAP[extractStatusName(status)] ?? status.toUpperCase();
};

/**
 * Normalize status value - extract the status name from STATUS_XX_NAME format
 */
export const normalizeStatus = (status: string | undefined): string => {
  if (!status) return '';
  return extractStatusName(status);
};

/**
 * Check if a status matches a specific value (handles both formats)
 */
export const isStatus = (
  actualStatus: string | undefined,
  expectedStatus: string,
): boolean =>
  // const normalized = normalizeStatus(actualStatus);
  // const expected = expectedStatus.toLowerCase().replace(/[\s-]/g, '_');
  actualStatus === expectedStatus;

/**
 * Get status color for job types (PUSH/PULL)
 */
export const getJobTypeColor = (type: string | undefined): string => {
  if (!type) return 'bg-gray-100 text-gray-700';

  const normalizedType = type.toLowerCase();

  switch (normalizedType) {
    case 'push':
      return 'bg-purple-100 text-purple-700';
    case 'pull':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};
