const STATUS_PREFIX_LENGTH = 3;
const STATUS_NAME_START_INDEX = 2;

const DEFAULT_BADGE = 'bg-gray-50 text-gray-600 border border-gray-200';

const STATUS_BADGE_MAP: Record<string, string> = {
  in_progress: 'bg-yellow-50 text-yellow-600 border border-yellow-200',
  under_review: 'bg-blue-50 text-blue-600 border border-blue-200',
  'under review': 'bg-blue-50 text-blue-600 border border-blue-200',
  approved: 'bg-green-50 text-green-600 border border-green-200',
  active: 'bg-green-50 text-green-600 border border-green-200',
  'ready for approval': 'bg-green-50 text-green-600 border border-green-200',
  rejected: 'bg-red-50 text-red-600 border border-red-200',
  suspended: 'bg-red-50 text-red-600 border border-red-200',
  changes_requested: 'bg-orange-50 text-orange-600 border border-orange-200',
  'changes requested': 'bg-orange-50 text-orange-600 border border-orange-200',
  exported: 'bg-cyan-50 text-cyan-600 border border-cyan-200',
  ready_for_deployment:
    'bg-emerald-50 text-emerald-600 border border-emerald-200',
  'ready for deployment':
    'bg-emerald-50 text-emerald-600 border border-emerald-200',
  deployed: 'bg-indigo-50 text-indigo-600 border border-indigo-200',
  'in-progress': 'bg-yellow-50 text-yellow-600 border border-yellow-200',
  draft: 'bg-yellow-50 text-yellow-600 border border-yellow-200',
  status_01_in_progress:
    'bg-yellow-50 text-yellow-600 border border-yellow-200',
  cloned: 'bg-purple-50 text-purple-600 border border-purple-200',
};

export const getStatusBadge = (status: string): string => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.startsWith('status_')) {
    const parts = normalizedStatus.split('_');
    if (parts.length >= STATUS_PREFIX_LENGTH) {
      const statusName = parts.slice(STATUS_NAME_START_INDEX).join('_');
      return STATUS_BADGE_MAP[statusName] ?? DEFAULT_BADGE;
    }
  }

  return STATUS_BADGE_MAP[normalizedStatus] ?? DEFAULT_BADGE;
};
