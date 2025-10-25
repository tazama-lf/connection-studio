import { JobStatus, ScheduleStatus } from '../../utils/interfaces';

interface Schedule {
  id: number;
  name: string;
  iterations: number;
  schedule_status: ScheduleStatus;
  next_time: string | null;
  cron: string;
  status: JobStatus
}

export type { Schedule };
