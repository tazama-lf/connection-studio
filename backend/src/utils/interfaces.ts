enum ScheduleStatus {
  ACTIVE = 'active',
  INACTIVE = 'in-active',
}

enum IngestMode {
  APPEND = 'append',
  REPLACE = 'replace',
}

enum ConfigType {
  PUSH = 'push',
  PULL = 'pull',
}

enum FileType {
  CSV = 'CSV',
  JSON = 'JSON',
  TSV = 'TSV',
}

enum SourceType {
  SFTP = 'SFTP',
  HTTP = 'HTTP',
}

enum AuthType {
  USERNAME_PASSWORD = 'USERNAME_PASSWORD',
  PRIVATE_KEY = 'PRIVATE_KEY',
}

enum JobStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  INPROGRESS = 'in-progress',
  REJECTED = 'rejected',
}
interface ISuccess {
  success: boolean;
  message: string;
}

export {
  ScheduleStatus,
  type ISuccess,
  IngestMode,
  SourceType,
  JobStatus,
  FileType,
  AuthType,
  ConfigType,
};
