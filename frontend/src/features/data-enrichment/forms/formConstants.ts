export const defaultFormValues = {
  name: '',
  version: '',
  sourceType: 'sftp',
  description: '',
  schedule: '',
  host: '',
  port: '',
  authType: 'password',
  username: '',
  password: '',
  privateKey: '',
  pathPattern: '',
  fileFormat: 'csv',
  delimiter: '',
  httpMethod: 'GET',
  httpHeaders: '',
  endpointPath: '',
  endpointVersion: '',
  ingestMode: 'append',
  targetTable: '',
  targetCollection: '',
  headers: '',
  url: '',
};

export const sourceTypeOptions = [
  { label: 'SFTP', value: 'sftp' },
  { label: 'HTTPS', value: 'http' },
];

export const authenticationTypeOptions = [
  { label: 'Username & Password', value: 'password' },
  { label: 'Username & Private Key', value: 'key' },
];

export const fileFormatOptions = [
  { label: 'CSV', value: 'csv' },
  { label: 'TSV', value: 'tsv' },
  { label: 'JSON', value: 'json' },
];

export const ingestModeOptions = [
  { label: 'Append - Add new records to existing data', value: 'append' },
  {
    label: 'Replace - Archive existing data and append new data',
    value: 'replace',
  },
];

export interface Schedule {
  id: string;
  name: string;
  cron: string;
  iterations: number;
}

export const getAssociatedScheduleOptions = (
  schedules: Schedule[],
): Array<{ label: string; value: string }> =>
  schedules.map((schedule) => ({
    label: `${schedule.name} - ${schedule.cron} (${schedule.iterations === 1 ? '1 iteration' : `${schedule.iterations} iterations`})`,
    value: schedule.id,
  }));