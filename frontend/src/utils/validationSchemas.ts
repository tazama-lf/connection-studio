import * as Yup from 'yup';

// Login validation schema
export const loginSchema = Yup.object({
  email: Yup.string()
    .required('Email is required')
    .email('Please enter a valid email address')
    .matches(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please enter a valid email address'
    ),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

// Config name validation schema (used in various config forms)
export const configNameSchema = Yup.object({
  name: Yup.string()
    .required('Name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters')
    .matches(
      /^[a-zA-Z0-9_\-\s]+$/,
      'Name can only contain letters, numbers, spaces, hyphens, and underscores'
    ),
});

// Endpoint/Config creation validation schema
export const endpointDataSchema = Yup.object({
  version: Yup.string()
    .required('Version is required')
    .matches(
      /^[^\s]+$/,
      'Version cannot contain spaces'
    )
    .matches(
      /^\d+\.\d+(\.\d+)?$/,
      'Version must be in format X.Y or X.Y.Z (e.g., 1.0 or 1.0.0)'
    ),
  transactionType: Yup.string()
    .required('Transaction Type is required')
    .min(2, 'Transaction Type must be at least 2 characters')
    .max(100, 'Transaction Type must not exceed 100 characters')
    .matches(
      /^[^\s]+$/,
      'Transaction Type cannot contain spaces'
    )
    .matches(
      /^[a-zA-Z0-9_\-]+$/,
      'Transaction Type can only contain letters, numbers, hyphens, and underscores'
    ),
  msgFam: Yup.string()
    .max(100, 'Message Family must not exceed 100 characters')
    .matches(
      /^$|^[^\s]+$/,
      'Message Family cannot contain spaces'
    )
    .matches(
      /^$|^[a-zA-Z0-9_\-]+$/,
      'Message Family can only contain letters, numbers, hyphens, and underscores'
    )
    .notRequired(),
  description: Yup.string()
    .max(500, 'Description must not exceed 500 characters')
    .notRequired(),
  contentType: Yup.string()
    .required('Content Type is required')
    .oneOf(['application/json', 'application/xml'], 'Content Type must be either application/json or application/xml'),
});

// Endpoint configuration validation schema
export const endpointConfigSchema = Yup.object({
  name: Yup.string()
    .required('Endpoint name is required')
    .min(3, 'Endpoint name must be at least 3 characters')
    .max(100, 'Endpoint name must not exceed 100 characters'),
  url: Yup.string()
    .required('URL is required')
    .url('Please enter a valid URL')
    .matches(
      /^https?:\/\/.+/,
      'URL must start with http:// or https://'
    ),
  method: Yup.string()
    .required('HTTP method is required')
    .oneOf(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], 'Invalid HTTP method'),
  headers: Yup.object().test(
    'valid-json',
    'Headers must be valid JSON',
    (value) => {
      if (!value) return true;
      try {
        // If it's already an object, it's valid
        if (typeof value === 'object') return true;
        // If it's a string, try parsing it
        if (typeof value === 'string') {
          JSON.parse(value);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }
  ),
});

// Payload validation schema
export const payloadSchema = Yup.object({
  payload: Yup.string()
    .required('Payload is required')
    .test('valid-json', 'Payload must be valid JSON', (value) => {
      if (!value) return false;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }),
});

// Mapping validation schema
export const mappingSchema = Yup.object({
  sourceField: Yup.string().required('Source field is required'),
  targetField: Yup.string().required('Target field is required'),
});

// Function parameter validation schema
export const functionParameterSchema = Yup.object({
  name: Yup.string()
    .required('Parameter name is required')
    .matches(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      'Parameter name must start with a letter or underscore and contain only alphanumeric characters and underscores'
    ),
  value: Yup.mixed().required('Parameter value is required'),
});

// Dry run simulation validation schema
export const dryRunSchema = Yup.object({
  payload: Yup.string()
    .required('Payload is required for dry run')
    .test('valid-json', 'Payload must be valid JSON', (value) => {
      if (!value) return false;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }),
});

// Helper function to validate and return errors
export const validateField = async (
  schema: Yup.ObjectSchema<any>,
  field: string,
  value: any
) => {
  try {
    await schema.validateAt(field, { [field]: value });
    return null; // No error
  } catch (error) {
    if (error instanceof Yup.ValidationError) {
      return error.message;
    }
    return 'Validation error';
  }
};

// Helper function to validate entire form
export const validateForm = async (
  schema: Yup.ObjectSchema<any>,
  values: any
) => {
  try {
    await schema.validate(values, { abortEarly: false });
    return {}; // No errors
  } catch (error) {
    if (error instanceof Yup.ValidationError) {
      const errors: Record<string, string> = {};
      error.inner.forEach((err) => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
      return errors;
    }
    return { general: 'Validation error occurred' };
  }
};
