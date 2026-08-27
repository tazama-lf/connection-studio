import * as yup from 'yup';

export const eventTypeSchema = yup
  .string()
  .notRequired() // Optional field
  .max(50, 'Event Type must be at most 50 characters')
  .test(
    'format',
    'Event Type must be alphanumeric and can only contain _, -, / in the middle (not at start or end)',
    (value) => {
      if (!value || value.trim() === '') {
        return true;
      }
      const regex = /^[a-zA-Z0-9]+(?:[_/-][a-zA-Z0-9]+)*$/;
      return regex.test(value);
    },
  );

export const versionSchema = yup
  .string()
  .required('Version is required')
  .min(1, 'Version must be at least 1 character')
  .max(50, 'Version must be at most 50 characters')
  .matches(
    /^v?\d+\.\d+\.\d+$/,
    'Version must follow semantic versioning format (e.g: 1.0.0 or v1.0.0)',
  );
export const transactionTypeSchema = yup
  .string()
  .required('Transaction Type is required')
  .min(1, 'Transaction Type must be at least 1 character')
  .max(50, 'Transaction Type must be at most 50 characters')
  .matches(
    /^[a-z_][a-z0-9_]*$/,
    'Transaction Type must start with a lowercase letter or underscore and contain only lowercase letters, numbers, or underscores',
  );
