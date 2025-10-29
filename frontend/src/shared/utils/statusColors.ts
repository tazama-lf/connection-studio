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
  | 'deployed';

export type ScheduleStatus = 'active' | 'in-active' | 'pending_approval';

/**
 * Get standardized Tailwind CSS classes for workflow statuses
 * Used for configs, jobs, cron jobs, etc.
 */
export const getStatusColor = (status: string | undefined): string => {
  if (!status) return 'bg-gray-100 text-gray-800';
  
  const normalizedStatus = status.toLowerCase().trim();
  
  switch (normalizedStatus) {
    // In Progress - Blue
    case 'in-progress':
    case 'in progress':
    case 'draft':
      return 'bg-blue-100 text-blue-800';
    
    // Under Review / Pending - Yellow
    case 'under-review':
    case 'under review':
    case 'pending':
    case 'pending_approval':
    case 'pending approval':
      return 'bg-yellow-100 text-yellow-800';
    
    // Approved - Green
    case 'approved':
    case 'active':
      return 'bg-green-100 text-green-800';
    
    // Rejected - Red
    case 'rejected':
    case 'failed':
      return 'bg-red-100 text-red-800';
    
    // Exported / Ready for Deployment - Indigo
    case 'exported':
    case 'ready-for-deployment':
    case 'ready for deployment':
    case 'ready':
      return 'bg-indigo-100 text-indigo-800';
    
    // Deployed - Teal
    case 'deployed':
    case 'published':
      return 'bg-teal-100 text-teal-800';
    
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
  
  switch (normalizedStatus) {
    case 'in-progress':
    case 'in progress':
      return 'IN PROGRESS';
    case 'under-review':
    case 'under review':
      return 'UNDER REVIEW';
    case 'pending_approval':
    case 'pending approval':
      return 'PENDING APPROVAL';
    case 'exported':
      return 'READY FOR DEPLOYMENT';
    case 'ready-for-deployment':
    case 'ready for deployment':
      return 'READY FOR DEPLOYMENT';
    case 'in-active':
      return 'INACTIVE';
    default:
      return status.toUpperCase();
  }
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
