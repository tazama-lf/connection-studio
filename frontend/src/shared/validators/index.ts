import * as yup from 'yup';

export const eventTypeSchema = yup
  .string()
  .required('Event Type is required')
  .test(
    'format',
    'Event Type must be alphanumeric and can only contain _, -, / in the middle (not at start or end)',
    (value) => {
      const regex = /^[a-zA-Z0-9]+(?:[_/-][a-zA-Z0-9]+)*$/;
      return regex.test(value);
    },
  );

export const versionSchema = yup
  .string()
  .required('Version is required')
  .max(50, 'Version must not exceed 50 characters')
  .matches(
    /^v?\d+\.\d+\.\d+$/,
    'Version must follow semantic versioning format (e.g: 1.0.0 or v1.0.0)',
  );
export const transactionTypeSchema = yup
  .string()
  .required('Transaction Type is required')
  .max(50, 'Transaction Type must not exceed 50 characters')
  .matches(
    /^[a-z_][a-z0-9_]*(?:\.[a-z0-9_]+)*$/,
    'Transaction Type must start with a lowercase letter or underscore, contain only lowercase letters, numbers, or underscores, and may use dots to separate segments (e.g: pacs.008)',
  );
