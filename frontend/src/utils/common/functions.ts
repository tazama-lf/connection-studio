export const getStatusBadge = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.startsWith('status_')) {
    const parts = normalizedStatus.split('_');
    if (parts.length >= 3) {
      const statusName = parts.slice(2).join('_');
      switch (statusName) {
        case 'in_progress':
          return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
        case 'under_review':
          return 'bg-blue-50 text-blue-600 border border-blue-200';
        case 'approved':
          return 'bg-green-50 text-green-600 border border-green-200';
        case 'rejected':
          return 'bg-red-50 text-red-600 border border-red-200';
        case 'changes_requested':
          return 'bg-orange-50 text-orange-600 border border-orange-200';
        case 'exported':
          return 'bg-cyan-50 text-cyan-600 border border-cyan-200';
        case 'ready_for_deployment':
          return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
        case 'deployed':
          return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
        case 'suspended':
          return 'bg-red-50 text-red-600 border border-red-200';
        default:
          return 'bg-gray-50 text-gray-600 border border-gray-200';
      }
    }
  }

  switch (normalizedStatus) {
    case 'active':
    case 'ready for approval':
    case 'approved':
      return 'bg-green-50 text-green-600 border border-green-200';
    case 'in-progress':
    case 'in_progress':
    case 'draft':
    case 'status_01_in_progress':
      return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
    case 'suspended':
    case 'rejected':
      return 'bg-red-50 text-red-600 border border-red-200';
    case 'cloned':
      return 'bg-purple-50 text-purple-600 border border-purple-200';
    case 'under_review':
    case 'under review':
      return 'bg-blue-50 text-blue-600 border border-blue-200';
    case 'deployed':
      return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
    case 'changes_requested':
    case 'changes requested':
      return 'bg-orange-50 text-orange-600 border border-orange-200';
    case 'exported':
      return 'bg-cyan-50 text-cyan-600 border border-cyan-200';
    case 'ready_for_deployment':
    case 'ready for deployment':
      return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
    default:
      return 'bg-gray-50 text-gray-600 border border-gray-200';
  }
};
