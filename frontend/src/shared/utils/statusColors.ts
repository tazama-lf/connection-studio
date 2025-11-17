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

/**
 * Get standardized Tailwind CSS classes for workflow statuses
 * Used for configs, jobs, cron jobs, etc.
 */
export const getStatusColor = (status: string | undefined): string => {
  if (!status) return 'bg-gray-100 text-gray-800';
  
  const normalizedStatus = status.toLowerCase().trim();
  
  // Handle STATUS_XX_NAME format from database - extract the name part
  let statusName = normalizedStatus;
  if (normalizedStatus.startsWith('status_')) {
    const parts = normalizedStatus.split('_');
    if (parts.length >= 3) {
      statusName = parts.slice(2).join('_'); // Get everything after STATUS_XX_
    }
  }
  
  switch (statusName) {
    // In Progress - Blue
    case 'in_progress':
    case 'in progress':
    case 'draft':
      return 'bg-blue-100 text-blue-800';
    
    // Suspended - Orange
    case 'suspended':
      return 'bg-orange-100 text-orange-800';
    
    // Under Review / Pending - Yellow
    case 'under_review':
    case 'under review':
    case 'pending':
    case 'pending_approval':
    case 'pending approval':
      return 'bg-yellow-100 text-yellow-800';
    
    // Approved - Green
    case 'approved':
    case 'active':
      return 'bg-green-100 text-green-800';
    
    // Rejected / Failed - Red
    case 'rejected':
    case 'failed':
      return 'bg-red-100 text-red-800';
    
    // Exported / Ready for Deployment - Indigo
    case 'exported':
    case 'ready_for_deployment':
    case 'ready for deployment':
    case 'ready':
      return 'bg-indigo-100 text-indigo-800';
    
    // Deployed - Teal
    case 'deployed':
    case 'published':
      return 'bg-teal-100 text-teal-800';
    
    // Changes Requested - Purple
    case 'changes_requested':
    case 'changes requested':
      return 'bg-purple-100 text-purple-800';
    
    // Inactive - Gray
    case 'in-active':
    case 'inactive':
    case 'disabled':
      return 'bg-gray-100 text-gray-800';
    
    // Default fallback
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get human-readable status label
 */
export const getStatusLabel = (status: string | undefined): string => {
  if (!status) return 'UNKNOWN';
  
  const normalizedStatus = status.toLowerCase().trim();
  
  // Handle STATUS_XX_NAME format from database - extract the name part
  let statusName = normalizedStatus;
  if (normalizedStatus.startsWith('status_')) {
    const parts = normalizedStatus.split('_');
    if (parts.length >= 3) {
      statusName = parts.slice(2).join('_'); // Get everything after STATUS_XX_
    }
  }
  
  switch (statusName) {
    case 'in_progress':
    case 'in progress':
      return 'IN PROGRESS';
    case 'suspended':
      return 'SUSPENDED';
    case 'under_review':
    case 'under review':
      return 'UNDER REVIEW';
    case 'pending_approval':
    case 'pending approval':
      return 'PENDING APPROVAL';
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'exported':
    case 'ready_for_deployment':
    case 'ready for deployment':
    case 'ready':
      return 'READY FOR DEPLOYMENT';
    case 'deployed':
      return 'DEPLOYED';
    case 'changes_requested':
    case 'changes requested':
      return 'CHANGES REQUESTED';
    case 'in-active':
    case 'inactive':
      return 'INACTIVE';
    default:
      return status.toUpperCase();
  }
};

/**
 * Normalize status value - extract the status name from STATUS_XX_NAME format
 */
export const normalizeStatus = (status: string | undefined): string => {
  if (!status) return '';
  
  const normalizedStatus = status.toLowerCase().trim();
  
  // Handle STATUS_XX_NAME format from database - extract the name part
  if (normalizedStatus.startsWith('status_')) {
    const parts = normalizedStatus.split('_');
    if (parts.length >= 3) {
      return parts.slice(2).join('_'); // Get everything after STATUS_XX_
    }
  }
  
  return normalizedStatus;
};

/**
 * Check if a status matches a specific value (handles both formats)
 */
export const isStatus = (actualStatus: string | undefined, expectedStatus: string): boolean => {
  // const normalized = normalizeStatus(actualStatus);
  // const expected = expectedStatus.toLowerCase().replace(/[\s-]/g, '_');
  return actualStatus === expectedStatus;
};

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
