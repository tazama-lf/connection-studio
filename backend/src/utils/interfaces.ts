

enum ScheduleStatus {
  ACTIVE = 'active',
  INACTIVE = 'in-active',
}

interface ISuccess {
  success: boolean,
  message: string
}

export { ScheduleStatus, type ISuccess };
