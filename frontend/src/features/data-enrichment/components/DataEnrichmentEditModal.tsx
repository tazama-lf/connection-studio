import { useAuth } from '@features/auth';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Grid } from '@mui/material';
import Alert from '@mui/material/Alert';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import { ArrowLeft, DownloadIcon, Save, UploadIcon, XIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
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

export const DataEnrichmentEditModal: React.FC<
  DataEnrichmentEditModalProps
  // ----------PROPS
> = ({ isOpen, onClose, onSave, editMode = false, selectedJob }) => {
  // ----------STATES
  const [currentStep, setCurrentStep] = useState<
    'config' | 'preview' | 'summary'
  >('config');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configurationType, setConfigurationType] = useState<'pull' | 'push'>(
    selectedJob?.type?.toLowerCase() || 'pull',
  );
  const [isLoadingJob, setIsLoadingJob] = useState(false); // Used in JSX rendering
  const [availableSchedules, setAvailableSchedules] = useState<
    ScheduleResponse[]
  >([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const tenantId = useAuth()?.user?.tenantId || 'tenantId';

  // --------------------REACT HOOKS FORM SETUP
  const loadSchema =
    configurationType === 'pull' ? pullValidationSchema : pushValidationSchema;
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
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

  // Form submission handler for React Hook Form
  const onSubmit = (data: any) => {
    console.log('Form Data:', data);
    // Navigate to review/summary page after successful form validation
    setCurrentStep('summary');
  };

  // --------------------REACT HOOKS FORM SETUP

  // Reset form state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowConfigForm(false);
    }
  }, [isOpen]);

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
              label={
                <>
                  Headers <span className="text-red-500">*</span>
                </>
              }
              placeholder='e.g: {accept: "application/json", agent: "DataEnrichment/1.0"}'
              rows={2}
            />
            {errors?.headers && (
              <ValidationError message={errors?.headers?.message} />
            )}
          </Grid>
        </Grid>
      )}

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

  //   const handleSave = async () => {
  //     try {
  //       setIsCreating(true);
  //       setCreateError(null);
  //       setCreateSuccess(null);
  //       const formValues = getValues();
  //       let payload: any;

  //       if (configurationType === 'push') {
  //         payload = {
  //           endpoint_name: formValues.name || null,
  //           path: formValues.endpointPath || null,
  //           description: formValues.description || null,
  //           table_name: formValues.targetTable || null,
  //           mode: formValues.ingestMode as 'append' | 'replace',
  //           version:
  //             formValues.version?.replace(/^v?\/*/g, '').replace(/\/+$/g, '') ||
  //             null,
  //         };
  //       } else {
  //         // Pull configuration payload
  //         const basePayload = {
  //           endpoint_name: formValues.name || null,
  //           source_type: formValues.sourceType.toUpperCase() as 'HTTPS' | 'SFTP',
  //           description: formValues.description || null,
  //           table_name: formValues.targetTable || null,
  //           mode: formValues.ingestMode as 'append' | 'replace',
  //           version: formValues.version || null,
  //           schedule_id: formValues.schedule || null,
  //         };

  //         if (formValues.sourceType === 'https') {
  //           // HTTPS Pull configuration
  //           let headers;
  //           try {
  //             headers = formValues.headers
  //               ? JSON.parse(formValues.headers)
  //               : { 'content-type': 'application/json' };
  //           } catch {
  //             headers = { 'content-type': 'application/json' };
  //           }

  //           payload = {
  //             ...basePayload,
  //             source_type: 'HTTPS' as const,
  //             connection: {
  //               url: formValues.url,
  //               headers,
  //             },
  //           };
  //         } else {
  //           // SFTP Pull configuration
  //           payload = {
  //             ...basePayload,
  //             source_type: 'SFTP' as const,
  //             connection: {
  //               host: formValues.host,
  //               port: parseInt(formValues.port) || null,
  //               auth_type:
  //                 formValues.authType === 'key'
  //                   ? ('PRIVATE_KEY' as const)
  //                   : ('USERNAME_PASSWORD' as const),
  //               user_name: formValues.username,
  //               ...(formValues.authType === 'password'
  //                 ? { password: formValues.password }
  //                 : { private_key: formValues.password.replace(/\\n/g, '\n') }), // Using password field for private key
  //             },
  //             file: {
  //               path: formValues.pathPattern || '/data.csv',
  //               file_type: formValues.fileFormat.toUpperCase() as
  //                 | 'CSV'
  //                 | 'JSON'
  //                 | 'TSV',
  //               delimiter: formValues.delimiter || ',',
  //             },
  //           };
  //         }
  //       }

  //       // Call appropriate API based on mode and configuration type
  //       let response;
  //       if (editMode && selectedJob?.id) {
  //         response =
  //           configurationType === 'pull'
  //             ? await dataEnrichmentApi.updatePullJob(selectedJob.id, payload)
  //             : await dataEnrichmentApi.updatePushJob(selectedJob.id, payload);
  //       } else {
  //         response =
  //           configurationType === 'pull'
  //             ? await dataEnrichmentApi.createPullJob(payload)
  //             : await dataEnrichmentApi.createPushJob(payload);
  //       }

  //       const successMessage = editMode
  //         ? `Data enrichment endpoint "${formValues.name}" updated successfully!`
  //         : `Data enrichment endpoint "${formValues.name}" created successfully! You can now send it for approval.`;

  //       setCreateSuccess(successMessage);
  //       if (onSave) {
  //         onSave(response);
  //       }

  //       // Close modal after showing success message
  //       setTimeout(() => {
  //         onClose();
  //       }, 1500);
  //     } catch (error) {
  //       console.error('=== CREATE ENDPOINT ERROR ===', error);

  //       let errorMessage = 'Failed to create endpoint';

  //       if (error && typeof error === 'object' && 'response' in error) {
  //         const apiError = error as any;
  //         const backendMessage =
  //           apiError.response?.data?.message ||
  //           apiError.response?.data?.error ||
  //           apiError.response?.data?.details;

  //         if (backendMessage) {
  //           errorMessage = `Backend error: ${backendMessage}`;
  //         } else if (apiError.response?.status === 400) {
  //           errorMessage = 'Bad Request: Invalid data sent to backend';
  //         } else {
  //           errorMessage = `HTTP ${apiError.response?.status}: ${apiError.message || 'Unknown error'}`;
  //         }
  //       } else if (
  //         error instanceof TypeError &&
  //         error.message.includes('fetch')
  //       ) {
  //         errorMessage =
  //           'Cannot connect to data enrichment service. Please ensure the service is running';
  //       } else {
  //         errorMessage =
  //           error instanceof Error ? error.message : 'Unknown error occurred';
  //       }

  //       setCreateError(errorMessage);
  //     } finally {
  //       setIsCreating(false);
  //     }
  //   };

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
              {showConfigForm ? 'New Data Enrichment Configuration' : null}
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
                {configurationType === 'pull' ? (
                  <>
                    <DownloadIcon size={20} className="mr-2 text-blue-500" />
                    Pull Configuration (SFTP/HTTP)
                  </>
                ) : (
                  <>
                    <UploadIcon size={20} className="mr-2 text-purple-500" />
                    Push Configuration (REST API)
                  </>
                )}
              </h4>
              <p className="text-xs text-gray-600 mt-1 ml-7">
                {configurationType === 'pull'
                  ? 'Configure data fetching from external sources'
                  : 'Configure REST API endpoint for data ingestion'}
              </p>
            </Box>
            <form
              onSubmit={handleSubmit(onSubmit, onError)}
              className="space-y-2"
            >
              <div className="max-h-[calc(90vh-280px)] overflow-y-auto px-6 py-4">
                {configurationType === 'pull'
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
                    type="button"
                    variant="contained"
                    sx={{
                      marginRight: '10px',
                      backgroundColor: '#2b7fff',
                    }}
                    onClick={() => {
                      setShowConfigForm(false);
                      reset(defaultValues);
                    }}
                    startIcon={<ArrowLeft size={16} />}
                  >
                    Back
                  </Button>

                  <Button
                    variant="contained"
                    sx={{ backgroundColor: '#2b7fff' }}
                    type="submit"
                    startIcon={<Save size={16} />}
                  >
                    Save and Next
                  </Button>
                  {/* )} */}
                </div>
              </div>
            </form>
          </>
        </div>
      </Backdrop>
    </div>
  );
};
