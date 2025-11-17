import { useAuth } from '@features/auth';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Grid, CircularProgress } from '@mui/material';
import Alert from '@mui/material/Alert';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import { DownloadIcon, Loader2, Save, UploadIcon, XIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '../../../shared/providers/ToastProvider';
import {
  ApiPathInputField,
  DatabaseTableInputField,
  DelimiterInputField,
  EndpointNameInputField,
  FilePathInputField,
  HostInputField,
  MultiLineTextInputField,
  NumberInputField,
  PasswordInputField,
  SelectField,
  TextInputField,
  URLInputField,
  VersionInputField,
} from '../../../shared/components/FormFields';
import ValidationError from '../../../shared/components/ValidationError';
import { dataEnrichmentApi } from '../services';
import type { ScheduleResponse } from '../types';
import {
  authenticationTypeOptions,
  defaultValues,
  fileFormatOptions,
  getAssociatedScheduleOptions,
  ingestModeOptions,
  pullValidationSchema,
  pushValidationSchema,
  sourceTypeOptions,
} from './validationSchema';

// TYPES
interface DataEnrichmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (formData: any) => void;
  editMode?: boolean;
  selectedJob?: any;
}

const getJobType = (job) => {
  if (
    job?.type?.toLowerCase() === 'push' ||
    job?.type?.toLowerCase() === 'pull'
  ) {
    return job.type.toLowerCase();
  }
  // Fallback: if job has path but no source_type, it's PUSH; otherwise it's PULL
  return job?.path && !job?.source_type ? 'push' : 'pull';
};

export const DataEnrichmentEditModal: React.FC<
  DataEnrichmentEditModalProps
  // ----------PROPS
> = ({ isOpen, onClose, onSave, editMode = false, selectedJob }) => {
  // ----------STATES
  const [availableSchedules, setAvailableSchedules] = useState<
    ScheduleResponse[]
  >([]);

  const [isCreating, setIsCreating] = useState(false);

  const tenantId = useAuth()?.user?.tenantId || 'tenantId';
  const { showSuccess, showError } = useToast();

  const currentJobType = getJobType(selectedJob);
  const configurationType = currentJobType as 'pull' | 'push';

  // --------------------REACT HOOKS FORM SETUP
  const loadSchema =
    configurationType === 'pull' ? pullValidationSchema : pushValidationSchema;
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loadSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Ref to track if we should scroll to error on next render
  const shouldScrollToErrorRef = useRef(false);

  // Function called when form submission fails validation
  const onError = () => {
    shouldScrollToErrorRef.current = true;
  };

  // Helper function to generate endpoint URL
  const generateEndpointUrl = (version?: string, endpointPath?: string) => {
    // Clean version (remove 'v' prefix and slashes)
    const cleanVersion =
      version?.replace(/^v?\/*/g, '').replace(/\/+$/g, '') || '';

    // Clean endpoint path (ensure it starts with /)
    const cleanPath = endpointPath?.startsWith('/')
      ? endpointPath
      : `/${endpointPath || ''}`;

    if (!version && !endpointPath) {
      return `/${tenantId}/enrichment/{version}{path}`;
    }

    const versionPart = cleanVersion ? `/${cleanVersion}` : '/{version}';
    const pathPart = endpointPath ? cleanPath : '/{path}';

    return `/${tenantId}/enrichment${versionPart}${pathPart}`;
  };

  // Watch for errors and scroll when needed
  useEffect(() => {
    if (shouldScrollToErrorRef.current && Object.keys(errors).length > 0) {
      shouldScrollToErrorRef.current = false;
      scrollToFirstError(Object.keys(errors)[0]);
    }
  }, [errors]);

  // Watch for fileFormat changes and re-validate pathPattern
  const fileFormat = watch('fileFormat');
  useEffect(() => {
    const pathPattern = getValues('pathPattern');
    if (pathPattern) {
      trigger('pathPattern');
    }
  }, [fileFormat, trigger, getValues]);

  // Helper function to perform the actual scrolling
  const scrollToFirstError = (fieldName: string) => {
    const errorElement = document.querySelector(
      `[name="${fieldName}"]`,
    ) as HTMLElement;
    if (errorElement) {
      // Find the modal's scrollable container
      const modalContent =
        errorElement.closest('.MuiDialog-paper') ||
        errorElement.closest('.MuiModal-root') ||
        errorElement.closest('[role="dialog"]') ||
        document.querySelector('.MuiDialog-paper');

      if (modalContent) {
        // Scroll within the modal container
        errorElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      } else {
        // Fallback to window scroll if modal container not found
        errorElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }

      // Focus the field after scroll completes
      setTimeout(() => {
        errorElement.focus();
      }, 300);
    }
  };

  const handleSave = async () => {
    setIsCreating(true);
    try {
      const formValues = getValues();
      let payload: any;

      if (configurationType === 'push') {
        payload = {
          endpoint_name: formValues.name || null,
          path: formValues.endpointPath || null,
          description: formValues.description || null,
          table_name: formValues.targetTable || null,
          mode: formValues.ingestMode as 'append' | 'replace',
          version:
            formValues.version?.replace(/^v?\/*/g, '').replace(/\/+$/g, '') ||
            null,
        };
      } else {
        // Pull configuration payload
        const basePayload = {
          endpoint_name: formValues.name || null,
          source_type: formValues.sourceType.toUpperCase() as 'HTTPS' | 'SFTP',
          description: formValues.description || null,
          table_name: formValues.targetTable || null,
          mode: formValues.ingestMode as 'append' | 'replace',
          version: formValues.version || null,
          schedule_id: formValues.schedule || null,
        };

        if (formValues.sourceType === 'http') {
          // HTTPS Pull configuration
          payload = {
            ...basePayload,
            source_type: 'HTTP',
            connection: {
              url: formValues?.url,
              headers: formValues?.headers
                ? JSON.parse(formValues?.headers || {})
                : {},
            },
          };
        } else {
          // SFTP Pull configuration
          payload = {
            ...basePayload,
            source_type: 'SFTP',
            connection: {
              host: formValues.host,
              port: parseInt(formValues.port) || null,
              auth_type:
                formValues.authType === 'key'
                  ? ('PRIVATE_KEY' as const)
                  : ('USERNAME_PASSWORD' as const),
              user_name: formValues.username,
              ...(formValues.authType === 'password'
                ? { password: formValues.password }
                : { private_key: formValues.password.replace(/\\n/g, '\n') }), // Using password field for private key
            },
            file: {
              path: (formValues.pathPattern || '/data.csv').replace(/^\/+/, ''),
              file_type: formValues.fileFormat.toUpperCase() as
                | 'CSV'
                | 'JSON'
                | 'TSV',
              delimiter: formValues.delimiter || ',',
            },
          };
        }
      }

      let response;
      if (editMode && selectedJob?.id) {
        response =
          configurationType === 'pull'
            ? await dataEnrichmentApi.updatePullJob(selectedJob.id, payload)
            : await dataEnrichmentApi.updatePushJob(selectedJob.id, payload);
      } else {
        response =
          configurationType === 'pull'
            ? await dataEnrichmentApi.createPullJob(payload)
            : await dataEnrichmentApi.createPushJob(payload);
      }

      const successMessage = editMode
        ? `Data enrichment endpoint "${formValues.name}" updated successfully!`
        : `Data enrichment endpoint "${formValues.name}" created successfully! You can now send it for approval.`;

      showSuccess('Success', successMessage);
      if (onSave) {
        onSave(response);
      }

      // Close modal after showing success message
      setTimeout(() => {
        onClose();
      }, 200);
    } catch (error) {
      console.error('=== CREATE ENDPOINT ERROR ===', error);

      let errorMessage = 'Failed to create endpoint';

      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any;
        const backendMessage =
          apiError.response?.data?.message ||
          apiError.response?.data?.error ||
          apiError.response?.data?.details;

        if (backendMessage) {
          errorMessage = `Backend error: ${backendMessage}`;
        } else if (apiError.response?.status === 400) {
          errorMessage = 'Bad Request: Invalid data sent to backend';
        } else {
          errorMessage = `HTTP ${apiError.response?.status}: ${apiError.message || 'Unknown error'}`;
        }
      } else if (
        error instanceof TypeError &&
        error.message.includes('fetch')
      ) {
        errorMessage =
          'Cannot connect to data enrichment service. Please ensure the service is running';
      } else {
        errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
      }

      showError('Error', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // Form submission handler for React Hook Form
  const onSubmit = () => {
    console.log('Form submitted, calling handleSave...');
    handleSave();
  };

  // Debug useEffect to monitor isCreating state
  useEffect(() => {
    console.log('isCreating state changed:', isCreating);
  }, [isCreating]);

  // --------------------REACT HOOKS FORM SETUP

  // Load available schedules when modal opens
  useEffect(() => {
    const loadSchedules = async () => {
      if (!isOpen) return;

      try {
        const schedules = await dataEnrichmentApi.getAllSchedules();
        const schedule_data = schedules?.data;

        // Filter schedules to only show approved, exported, and deployed schedules
        const filteredSchedules = schedule_data?.filter(
          (schedule: any) =>
            schedule.status === 'STATUS_04_APPROVED' ||
            schedule.status === 'STATUS_06_EXPORTED',
        );

        console.log('filteredSchedules', schedules);
        setAvailableSchedules(filteredSchedules);
      } catch (error) {
        console.error('Failed to load schedules:', error);
        // Keep empty array as fallback
        setAvailableSchedules([]);
      } finally {
        console.log('Setting schedules loading to false');
      }
    };

    loadSchedules();
  }, [isOpen]);

  console.log('selectedJobselectedJob', selectedJob);

  // Set initial form values from selectedJob
  useEffect(() => {
    if (isOpen && selectedJob && editMode) {
      const jobType = getJobType(selectedJob);

      // Base values common to both push and pull jobs
      const initialValues: any = {
        name: selectedJob.endpoint_name || '',
        description: selectedJob.description || '',
        version: selectedJob.version || '',
        targetTable: selectedJob.table_name || '',
        ingestMode: selectedJob.mode || 'append',
      };

      if (jobType === 'push') {
        // Push job specific fields
        let endpointPath = selectedJob.path;

        // Ensure API path starts with a slash
        if (endpointPath && !endpointPath.startsWith('/')) {
          endpointPath = '/' + endpointPath;
        }
        initialValues.endpointPath = endpointPath;
      } else {
        // Pull job specific fields
        initialValues.sourceType =
          selectedJob.source_type?.toLowerCase() || 'sftp'; // Convert SFTP -> sftp, HTTPS -> https
        initialValues.schedule = selectedJob.schedule_id || '';

        // Connection settings for pull jobs
        if (selectedJob.connection) {
          if (selectedJob.source_type === 'SFTP') {
            // SFTP connection settings
            initialValues.host = selectedJob.connection.host || '';
            initialValues.port = selectedJob.connection.port?.toString() || '';
            initialValues.authType =
              selectedJob.connection.auth_type === 'PRIVATE_KEY'
                ? 'key'
                : 'password';
            initialValues.username = selectedJob.connection.user_name || '';
            // Note: We don't set password/private key for security reasons
          } else if (selectedJob.source_type === 'HTTPS') {
            // HTTPS connection settings
            initialValues.url = selectedJob.connection.url || '';
            initialValues.headers = selectedJob.connection.headers
              ? JSON.stringify(selectedJob.connection.headers, null, 2)
              : '';
          }
        }

        // File settings for pull jobs
        if (selectedJob.file) {
          let pathPattern = selectedJob.file.path || '';

          // Ensure file path starts with a slash
          if (pathPattern && !pathPattern.startsWith('/')) {
            pathPattern = '/' + pathPattern;
          }
          initialValues.pathPattern = pathPattern;
          initialValues.fileFormat =
            selectedJob.file.file_type?.toLowerCase() || 'csv'; // Convert CSV -> csv
          initialValues.delimiter = selectedJob.file.delimiter || ',';
        }
      }

      // Set the form values
      Object.entries(initialValues).forEach(([key, value]) => {
        setValue(key, value);
      });

      console.log('Set initial form values:', initialValues);
    }
  }, [isOpen, selectedJob, editMode, setValue]);

  // Prevent body scroll and scrollbar jitter when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store original body styles
      const originalStyle = window.getComputedStyle(document.body);
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      // Prevent body scroll and reserve scrollbar space
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      // Cleanup function to restore original styles
      return () => {
        document.body.style.overflow = originalStyle.overflow || '';
        document.body.style.paddingRight = originalStyle.paddingRight || '';
      };
    }
  }, [isOpen]);

  const RenderPullConfigForm = () => (
    <div className="space-y-6" data-id="element-818">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <EndpointNameInputField
            name="name"
            control={control}
            label={
              <>
                Endpoint Name <span className="text-red-500">*</span>
              </>
            }
            type="text"
            placeholder="only a-z, 0-9, _, - are allowed"
          />
          {errors?.name && <ValidationError message={errors?.name?.message} />}
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <VersionInputField
            name={'version'}
            control={control}
            label={
              <>
                Version <span className="text-red-500">*</span>
              </>
            }
            placeholder="Format: 1.0.0 or v1.0.0"
          />
          {errors?.version && (
            <ValidationError message={errors?.version?.message} />
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SelectField
            name={'sourceType'}
            control={control}
            label={
              <>
                Source Type <span className="text-red-500">*</span>
              </>
            }
            options={sourceTypeOptions || []}
          />
          {errors?.sourceType && (
            <ValidationError message={errors?.sourceType?.message} />
          )}
        </Grid>
        <Grid size={{ xs: 12 }}>
          <MultiLineTextInputField
            name={'description'}
            control={control}
            label={
              <>
                Description <span className="text-red-500">*</span>
              </>
            }
            placeholder="Enter Endpoint description"
            rows={2}
          />
          {errors?.description && (
            <ValidationError message={errors?.description?.message} />
          )}
        </Grid>
        <Grid size={{ xs: 12 }}>
          <SelectField
            name={'schedule'}
            control={control}
            label={
              <>
                Associated Schedule <span className="text-red-500">*</span>
              </>
            }
            options={getAssociatedScheduleOptions(availableSchedules) || []}
          />
          {errors?.schedule && (
            <ValidationError message={errors?.schedule?.message} />
          )}
        </Grid>
      </Grid>

      <Box sx={{ fontSize: '18px', fontWeight: 'bold', color: '#3b3b3b' }}>
        Connection Settings
      </Box>
      {watch('sourceType') === 'sftp' ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <HostInputField
              name={'host'}
              control={control}
              label={
                <>
                  Host <span className="text-red-500">*</span>
                </>
              }
              placeholder="10.10.80.37"
            />
            {errors?.host && (
              <ValidationError message={errors?.host?.message} />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <NumberInputField
              name={'port'}
              control={control}
              label={
                <>
                  Port <span className="text-red-500">*</span>
                </>
              }
              placeholder="2222"
              maxLength={5}
            />
            {errors?.port && (
              <ValidationError message={errors?.port?.message} />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SelectField
              name={'authType'}
              control={control}
              label={
                <>
                  Authentication Type <span className="text-red-500">*</span>
                </>
              }
              options={authenticationTypeOptions || []}
            />
            {errors?.authType && (
              <ValidationError message={errors?.authType?.message} />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextInputField
              name="username"
              control={control}
              label={
                <>
                  Username <span className="text-red-500">*</span>
                </>
              }
              type="text"
              placeholder="Enter Username"
            />
            {errors?.username && (
              <ValidationError message={errors?.username?.message} />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <PasswordInputField
              name="password"
              control={control}
              label={
                <>
                  {watch('authType') === 'key' ? 'Private Key' : 'Password'}{' '}
                  <span className="text-red-500">*</span>
                </>
              }
              type="text"
              placeholder={
                watch('authType') === 'key'
                  ? 'Enter Private Key'
                  : 'Enter Password'
              }
            />
            {errors?.password && (
              <ValidationError message={errors?.password?.message} />
            )}
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <URLInputField
              name="url"
              control={control}
              label={
                <>
                  URL <span className="text-red-500">*</span>
                </>
              }
              type="text"
              placeholder="https://dummyjson.com/users"
            />
            {errors?.url && <ValidationError message={errors?.url?.message} />}
          </Grid>
          <Grid size={{ xs: 12 }}>
            <MultiLineTextInputField
              name={'headers'}
              control={control}
              label={<>Headers (Optional)</>}
              placeholder='e.g: {accept: "application/json", agent: "DataEnrichment/1.0"}'
              rows={2}
            />
            {errors?.headers && (
              <ValidationError message={errors?.headers?.message} />
            )}
          </Grid>
        </Grid>
      )}

      {watch('sourceType') === 'sftp' ? (
        <>
          <Box sx={{ fontSize: '18px', fontWeight: 'bold', color: '#3b3b3b' }}>
            File Settings
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FilePathInputField
                name="pathPattern"
                control={control}
                label={
                  <>
                    File Path <span className="text-red-500">*</span>
                  </>
                }
                placeholder="/inbound/data_*.csv"
              />
              {errors?.pathPattern && (
                <ValidationError message={errors?.pathPattern?.message} />
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SelectField
                name={'fileFormat'}
                control={control}
                label={
                  <>
                    File Format <span className="text-red-500">*</span>
                  </>
                }
                options={fileFormatOptions || []}
              />
              {errors?.fileFormat && (
                <ValidationError message={errors?.fileFormat?.message} />
              )}
            </Grid>
            {watch('fileFormat') === 'csv' ? (
              <Grid size={{ xs: 12, md: 6 }}>
                <DelimiterInputField
                  name="delimiter"
                  control={control}
                  label={
                    <>
                      Delimiter <span className="text-red-500">*</span>
                    </>
                  }
                  type="text"
                  placeholder=","
                  maxLength={1}
                />
                {errors?.delimiter && (
                  <ValidationError message={errors?.delimiter?.message} />
                )}
              </Grid>
            ) : null}
          </Grid>
        </>
      ) : null}

      <Box sx={{ fontSize: '18px', fontWeight: 'bold', color: '#3b3b3b' }}>
        Target PostgreSQL Settings
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <DatabaseTableInputField
            name="targetTable"
            control={control}
            fullWidth={true}
            maxWidth={65}
            label={
              <>
                Table Name <span className="text-red-500">*</span>
              </>
            }
            type="text"
            placeholder="e.g: customers_2025"
          />
          {errors?.targetTable && (
            <ValidationError message={errors?.targetTable?.message} />
          )}
        </Grid>
      </Grid>

      <Box sx={{ fontSize: '18px', fontWeight: 'bold', color: '#3b3b3b' }}>
        Ingest Settings
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <SelectField
            name={'ingestMode'}
            control={control}
            label={
              <>
                Ingest Mode <span className="text-red-500">*</span>
              </>
            }
            options={ingestModeOptions || []}
          />
          <Box sx={{ fontSize: '10px', color: 'gray', mt: 1 }}>
            {watch('ingestMode') === 'append'
              ? 'Append mode adds new records to the existing dataset.'
              : 'Replace mode archives the current dataset and creates a new version with the uploaded data.'}
          </Box>
          {errors?.ingestMode && (
            <ValidationError message={errors?.ingestMode?.message} />
          )}
        </Grid>
      </Grid>
    </div>
  );

  const renderPushConfigForm = () => (
    <div className="space-y-6" data-id="element-818">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <EndpointNameInputField
            name="name"
            control={control}
            label={
              <>
                Endpoint Name <span className="text-red-500">*</span>
              </>
            }
            type="text"
            placeholder="only a-z, 0-9, _, - are allowed"
          />
          {errors?.name && <ValidationError message={errors?.name?.message} />}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <VersionInputField
            name={'version'}
            control={control}
            label={
              <>
                Version <span className="text-red-500">*</span>
              </>
            }
            placeholder="Format: 1.0.0 or v1.0.0"
          />
          {errors?.version && (
            <ValidationError message={errors?.version?.message} />
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <ApiPathInputField
            name={'endpointPath'}
            control={control}
            label={
              <>
                API Path <span className="text-red-500">*</span>
              </>
            }
          />
          {errors?.endpointPath && (
            <ValidationError message={errors?.endpointPath?.message} />
          )}
        </Grid>

        <Alert severity="info" sx={{ width: '100%', borderRadius: '5px' }}>
          <Box sx={{ fontWeight: 'bold' }}>Endpoint Path Preview</Box>
          <Box
            sx={{ color: 'gray', fontFamily: 'monospace', fontSize: '14px' }}
          >
            {(() => {
              const version = watch('version');
              const endpointPath = watch('endpointPath');

              // Clean version (remove 'v' prefix and slashes)
              const cleanVersion =
                version?.replace(/^v?\/*/g, '').replace(/\/+$/g, '') || '';

              // Clean endpoint path (ensure it starts with /)
              const cleanPath = endpointPath?.startsWith('/')
                ? endpointPath
                : `/${endpointPath || ''}`;

              if (!version && !endpointPath) {
                return `/${tenantId}/enrichment/{version}{path}`;
              }

              const versionPart = cleanVersion
                ? `/${cleanVersion}`
                : '/{version}';
              const pathPart = endpointPath ? cleanPath : '/{path}';

              return `/${tenantId}/enrichment${versionPart}${pathPart}`;
            })()}
          </Box>
          <Box sx={{ fontSize: '12px', color: '#666', mt: 1 }}>
            Example: /{tenantId}/enrichment/v1.0.0/customer/data
          </Box>
        </Alert>

        <Grid size={{ xs: 12 }}>
          <MultiLineTextInputField
            name={'description'}
            control={control}
            label={
              <>
                Description <span className="text-red-500">*</span>
              </>
            }
            placeholder="Enter Endpoint description"
            rows={2}
          />
          {errors?.description && (
            <ValidationError message={errors?.description?.message} />
          )}
        </Grid>
      </Grid>

      <Box sx={{ fontSize: '18px', fontWeight: 'bold', color: '#3b3b3b' }}>
        Target PostgreSQL Settings
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <DatabaseTableInputField
            name="targetTable"
            control={control}
            fullWidth={true}
            maxWidth={65}
            label={
              <>
                Table Name <span className="text-red-500">*</span>
              </>
            }
            type="text"
            placeholder="e.g: customers_2025"
          />
          {errors?.targetTable && (
            <ValidationError message={errors?.targetTable?.message} />
          )}
        </Grid>
      </Grid>

      <Box sx={{ fontSize: '18px', fontWeight: 'bold', color: '#3b3b3b' }}>
        Ingest Settings
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <SelectField
            name={'ingestMode'}
            control={control}
            label={
              <>
                Ingest Mode <span className="text-red-500">*</span>
              </>
            }
            options={ingestModeOptions || []}
          />
          <Box sx={{ fontSize: '10px', color: 'gray', mt: 1 }}>
            {watch('ingestMode') === 'append'
              ? 'Append mode adds new records to the existing dataset.'
              : 'Replace mode archives the current dataset and creates a new version with the uploaded data.'}
          </Box>
          {errors?.ingestMode && (
            <ValidationError message={errors?.ingestMode?.message} />
          )}
        </Grid>
      </Grid>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      data-id="element-1046"
      style={{ overflow: 'hidden' }}
    >
      <Backdrop
        sx={(theme) => ({
          zIndex: theme.zIndex.drawer + 1,
          overflow: 'hidden',
        })}
        open={true}
      >
        <div
          className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 shadow-2xl"
          data-id="element-1047"
        >
          {/* Header with close button */}
          <div
            className="flex justify-between items-center px-6 py-4 border-b border-gray-200"
            data-id="element-1048"
          >
            <Box
              sx={{ fontSize: '20px', fontWeight: 'bold', color: '#2b7fff' }}
            >
              {'Edit Data Enrichment Endpoint'}
            </Box>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              data-id="element-1050"
            >
              <XIcon size={24} data-id="element-1051" />
            </button>
          </div>

          <>
            {/* Configuration Type Header */}
            <Box
              sx={{
                padding: '16px 24px',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <h4
                style={{ color: '#2b7fff' }}
                className=" font-semibold flex items-center"
              >
                {currentJobType === 'pull' ? (
                  <>
                    <DownloadIcon size={20} className="mr-2 text-blue-500" />
                    Pull Configuration (SFTP/HTTPS)
                  </>
                ) : (
                  <>
                    <UploadIcon size={20} className="mr-2 text-purple-500" />
                    Push Configuration (REST API)
                  </>
                )}
              </h4>
              <p className="text-xs text-gray-600 mt-1 ml-7">
                {currentJobType === 'pull'
                  ? 'Configure data fetching from external sources'
                  : 'Configure REST API endpoint for data ingestion'}
              </p>
            </Box>

            {/* Success and Error Messages are now handled by Toast notifications */}

            <form
              onSubmit={handleSubmit(onSubmit, onError)}
              className="space-y-2"
            >
              <div className="max-h-[calc(90vh-280px)] overflow-y-auto px-6 py-4">
                {currentJobType === 'pull'
                  ? RenderPullConfigForm()
                  : renderPushConfigForm()}
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center">
                <Button
                  type="button"
                  variant="outlined"
                  onClick={onClose}
                  sx={{ color: '#2b7fff' }}
                  startIcon={<XIcon size={16} />}
                >
                  Cancel
                </Button>

                <div className="flex space-x-3">
                  <Button
                    variant="contained"
                    sx={{ backgroundColor: '#2b7fff' }}
                    type="button"
                    onClick={handleSave}
                    disabled={isCreating}
                    startIcon={
                      isCreating ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Save size={16} />
                      )
                    }
                  >
                    {isCreating ? 'Updating...' : 'Update'}
                  </Button>
                  {/* )} */}
                </div>
              </div>
            </form>
          </>
        </div>
      </Backdrop>

      {/* Loading Backdrop */}
      {isCreating && (
        <Backdrop
          sx={(theme) => ({
            color: '#fff',
            zIndex: theme.zIndex.drawer + 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          })}
          open={isCreating}
        >
          <Loader2 size={48} className="animate-spin" />
          <Box sx={{ fontSize: '16px', fontWeight: 500 }}>
            {editMode ? 'Updating endpoint...' : 'Creating endpoint...'}
          </Box>
        </Backdrop>
      )}
    </div>
  );
};
