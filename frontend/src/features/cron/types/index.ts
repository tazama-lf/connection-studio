import type { CronJobStatus } from '../constants';

export interface ScheduleRequest {
  name: string;
  cron: string;
  iterations: number;
  start_date?: string;
  end_date?: string;
  schedule_status?: string;
  status?: string;
}

export interface CronJobConfirmationDialogProps {
  open: boolean;
  type: 'export' | 'approval' | 'approve' | '';
  jobName: string;
  actionLoading: '' | 'export' | 'approval' | 'approve';
  onClose: () => void;
  onConfirm: (type: 'export' | 'approval' | 'approve') => void;
}

export interface CronJobTableColumnsProps {
  searchingFilters: Record<string, unknown>;
  setSearchingFilters: React.Dispatch<
    React.SetStateAction<Record<string, unknown>>
  >;
  setPage: (page: number) => void;
  userRole: string;
  userIsEditor: boolean;
  userIsExporter: boolean;
  userIsApprover: boolean;
  userIsPublisher: boolean;
  onView: (schedule: ScheduleResponse) => void;
  onEdit: (schedule: ScheduleResponse) => void;
  onExport: (schedule: ScheduleResponse) => void;
}

export interface ScheduleCreateResponse {
  success: boolean;
  message: string;
}

export interface ScheduleResponse {
  id: string;
  name: string;
  cron: string;
  cronExpression: string;
  iterations: number;
  schedule_status: string;
  status?: CronJobStatus;
  next_time?: string | null;
  created_at?: string;
  start_date?: string;
  end_date?: string | null;
  comments?: string;
}

export interface PaginationParams {
  offset: number;
  limit: number;
  userRole?: string;
}

export interface PaginatedScheduleResponse {
  schedules: ScheduleResponse[];
  success?: boolean;
  data: ScheduleResponse[];
  total: number;
  pages: number;
  offset: number;
  limit: number;
}

export interface ErrorWithResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export type TabType = 'create' | 'manage';

export type ActionType = '' | 'export' | 'approval' | 'edit' | 'approve' | 'reject';

export interface CronTabNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export interface CronJobViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewFormData: ScheduleResponse;
  handleSendForApproval?: () => void;
  onApprove?: (scheduleId: string) => void;
  onReject?: (scheduleId: string) => void;
}

export type CronJobModalMode = 'create' | 'edit' | 'view';

export interface CronJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: CronJobModalMode;
  onJobCreated?: () => void;
  viewFormData?: ScheduleResponse;
  editFormData?: ScheduleResponse;
  setEditFormData?: (data: ScheduleResponse) => void;
  handleSendForApproval?: () => void;
  handleSaveEdit?: () => void;
  onApprove?: (scheduleId: string) => void;
  onReject?: (scheduleId: string) => void;
}

export interface CronJobListProps {
  searchTerm?: string;
}

export interface CronJobFormProps {
  onJobCreated?: () => void;
  onCancel?: () => void;
  viewFormData?: ScheduleResponse;
  editFormData?: ScheduleResponse;
  setEditFormData?: (data: ScheduleResponse) => void;
  handleSendForApproval?: () => void;
  handleSaveEdit?: () => void;
  onApprove?: (scheduleId: string) => void;
  onReject?: (scheduleId: string) => void;
}

export interface CronJobEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editFormData: ScheduleResponse;
  setEditFormData: (data: ScheduleResponse) => void;
  handleSaveEdit?: () => void;
}
