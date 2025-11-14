import { useAuth } from '@features/auth';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Grid } from '@mui/material';
import Alert from '@mui/material/Alert';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import {
  ArrowLeft,
  CheckCircleIcon,
  Circle,
  DownloadIcon,
  FileText,
  LassoSelect,
  Plus,
  Save,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  AlphaNumericInputField,
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
interface DataEnrichmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  editMode?: boolean;
  jobId?: string;
  jobType?: 'pull' | 'push';
}

// Helper function for pluralization
const getIterationText = (count: number) => {
  return count === 1 ? '1 iteration' : `${count} iterations`;
};

export const DataEnrichmentFormModal: React.FC<
  DataEnrichmentFormModalProps
  // ----------PROPS
> = ({ isOpen, onClose, onSave, editMode = false, jobId, jobType }) => {
  // ----------STATES
  const [currentStep, setCurrentStep] = useState<
    'config' | 'preview' | 'summary'
  >('config');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configurationType, setConfigurationType] = useState<'pull' | 'push'>(
    jobType || null,
  );
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [availableSchedules, setAvailableSchedules] = useState<
    ScheduleResponse[]
  >([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null,
  );
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    cron: '',
    iterations: 1,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [previewData, setPreviewData] = useState({
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    previewRows: [],
    validationErrors: [],
    isDemo: false,
    message: '',
  });

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
    formState: { errors, isValid },
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

  // Keep existing formData state for backward compatibility
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    configurationType: 'pull',
    sourceType: 'sftp',
    host: '',
    port: '',
    username: '',
    password: '',
    authType: 'password',
    privateKey: '',
    pathPattern: '',
    fileFormat: 'csv',
    delimiter: ',',
    httpMethod: 'GET',
    httpHeaders: '',
    endpointPath: '',
    endpointVersion: '',
    ingestMode: 'append',
    targetTable: '',
    targetCollection: '',
  });

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

  // Load available schedules when modal opens
  useEffect(() => {
    const loadSchedules = async () => {
      if (!isOpen) return;

      try {
        setSchedulesLoading(true);
        const schedules = await dataEnrichmentApi.getAllSchedules();
        // Filter schedules to only show approved, exported, and deployed schedules
        const filteredSchedules = schedules.filter(
          (schedule: any) =>
            schedule.status === 'approved' ||
            schedule.status === 'exported' ||
            schedule.status === 'deployed',
        );
        setAvailableSchedules(filteredSchedules);
      } catch (error) {
        console.error('Failed to load schedules:', error);
        // Keep empty array as fallback
        setAvailableSchedules([]);
      } finally {
        setSchedulesLoading(false);
      }
    };

    loadSchedules();
  }, [isOpen]);

  // Load job data when in edit mode
  useEffect(() => {
    const loadJobData = async () => {
      if (!isOpen || !editMode || !jobId) {
        return;
      }

      try {
        setIsLoadingJob(true);
        setCreateError(null);

        const job = await dataEnrichmentApi.getJob(
          jobId,
          jobType?.toUpperCase() as 'PULL' | 'PUSH',
        );

        // Populate form with job data
        // Use jobType prop first (most reliable), then fallback to job data
        const detectedConfigType =
          jobType ||
          ((job.config_type || job.type)?.toLowerCase() as 'pull' | 'push');

        // Push jobs can be identified by having a 'path' field and no 'source_type'
        const isPushJob = job.path && !job.source_type;
        const finalConfigType = isPushJob ? 'push' : detectedConfigType;

        setFormData({
          ...formData,
          name: job.endpoint_name,
          description: job.description || '',
          configurationType: finalConfigType,
          sourceType: job.source_type?.toLowerCase() || 'sftp',
          // Populate other fields based on job type and source type
          targetTable: job.table_name || '',
        });

        if (job.schedule_id) {
          setSelectedScheduleId(job.schedule_id);
        }

        setConfigurationType(finalConfigType);
      } catch (error) {
        console.error('Failed to load job data:', error);
        setCreateError('Failed to load job data. Please try again.');
      } finally {
        setIsLoadingJob(false);
      }
    };

    loadJobData();
  }, [isOpen, editMode, jobId, jobType]);

  // Set configuration type for new job creation
  useEffect(() => {
    if (isOpen && !editMode && jobType) {
      setConfigurationType(jobType);
      setValue('configurationType', jobType);
    }
  }, [isOpen, editMode, jobType, setValue]);

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

  const renderSummaryStep = () => {
    const formValues = getValues(); // Get all current form values
    return (
      <div className="space-y-6" data-id="element-818">
        <div
          className="flex items-center justify-center py-4"
          data-id="element-990"
        >
          <div className="bg-green-100 rounded-full p-5" data-id="element-991">
            <CheckCircleIcon size={44} color="#26a46b" />
          </div>
        </div>
        <Box sx={{ textAlign: 'center', marginTop: '-30px' }}>
          <Box sx={{ color: '#3b3b3b', fontSize: '22px', fontWeight: 'bold' }}>
            Ready to Create Endpoint
          </Box>
          <p className="text-gray-500" data-id="element-995">
            The data enrichment endpoint is ready for creation. Kindly validate
            your data before proceeding.
          </p>
        </Box>

        <div className="bg-gray-50 p-4 rounded-md" data-id="element-996">
          <Box
            sx={{
              color: '#2b7fff',
              fontWeight: 'bold',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FileText size={18} />
            Endpoint Summary
          </Box>
          <div className="space-y-3" data-id="element-998">
            {/* TYPE */}
            <div className="grid grid-cols-3 gap-4" data-id="element-999">
              <div
                className="col-span-1 text-sm font-medium text-gray-500"
                data-id="element-1000"
              >
                Type
              </div>
              <div
                className="col-span-2 text-sm text-gray-900 flex items-center"
                data-id="element-1001"
              >
                {configurationType === 'pull' ? (
                  <>
                    <DownloadIcon
                      size={16}
                      className="mr-1 text-blue-500"
                      data-id="element-1002"
                    />
                    Pull Configuration (SFTP/HTTPS)
                  </>
                ) : (
                  <>
                    <UploadIcon
                      size={16}
                      className="mr-1 text-purple-500"
                      data-id="element-1003"
                    />
                    Push Configuration (REST API)
                  </>
                )}
              </div>
            </div>
            {/* Endpoint Name */}
            <div className="grid grid-cols-3 gap-4" data-id="element-1004">
              <div
                className="col-span-1 text-sm font-medium text-gray-500"
                data-id="element-1005"
              >
                Endpoint Name
              </div>
              <div
                className="col-span-2 text-sm text-gray-900"
                data-id="element-1006"
              >
                {formValues.name}
              </div>
            </div>
            {/* Version */}
            <div className="grid grid-cols-3 gap-4" data-id="element-1004">
              <div
                className="col-span-1 text-sm font-medium text-gray-500"
                data-id="element-1005"
              >
                Version
              </div>
              <div
                className="col-span-2 text-sm text-gray-900"
                data-id="element-1006"
              >
                {formValues.version}
              </div>
            </div>
            {/* Description */}
            <div className="grid grid-cols-3 gap-4" data-id="element-1004">
              <div
                className="col-span-1 text-sm font-medium text-gray-500"
                data-id="element-1005"
              >
                Description
              </div>
              <div
                className="col-span-2 text-sm text-gray-900"
                data-id="element-1006"
              >
                {formValues.description || 'N/A'}
              </div>
            </div>

            {configurationType === 'pull' ? (
              <>
                <div className="grid grid-cols-3 gap-4" data-id="element-1007">
                  <div
                    className="col-span-1 text-sm font-medium text-gray-500"
                    data-id="element-1008"
                  >
                    Source Type
                  </div>
                  <div
                    className="col-span-2 text-sm text-gray-900"
                    data-id="element-1009"
                  >
                    {formValues.sourceType?.toUpperCase()}
                  </div>
                </div>

                {/* SFTP Configuration Fields */}
                {formValues.sourceType === 'sftp' ? (
                  <>
                    <div
                      className="grid grid-cols-3 gap-4"
                      data-id="element-1010"
                    >
                      <div
                        className="col-span-1 text-sm font-medium text-gray-500"
                        data-id="element-1011"
                      >
                        Connection
                      </div>
                      <div
                        className="col-span-2 text-sm text-gray-900"
                        data-id="element-1012"
                      >
                        {`${formValues.host}:${formValues.port || '22'}`}
                      </div>
                    </div>
                    <div
                      className="grid grid-cols-3 gap-4"
                      data-id="element-1013"
                    >
                      <div
                        className="col-span-1 text-sm font-medium text-gray-500"
                        data-id="element-1014"
                      >
                        Path/Pattern
                      </div>
                      <div
                        className="col-span-2 text-sm text-gray-900"
                        data-id="element-1015"
                      >
                        {formValues.pathPattern}
                      </div>
                    </div>
                    <div
                      className="grid grid-cols-3 gap-4"
                      data-id="element-1016"
                    >
                      <div
                        className="col-span-1 text-sm font-medium text-gray-500"
                        data-id="element-1017"
                      >
                        File Format
                      </div>
                      <div
                        className="col-span-2 text-sm text-gray-900"
                        data-id="element-1018"
                      >
                        {formValues.fileFormat?.toUpperCase()}
                      </div>
                    </div>
                  </>
                ) : (
                  /* HTTPS Configuration Fields */
                  <>
                    <div
                      className="grid grid-cols-3 gap-4"
                      data-id="element-1010"
                    >
                      <div
                        className="col-span-1 text-sm font-medium text-gray-500"
                        data-id="element-1011"
                      >
                        URL
                      </div>
                      <div
                        className="col-span-2 text-sm text-gray-900"
                        data-id="element-1012"
                      >
                        {formValues.url || 'N/A'}
                      </div>
                    </div>
                    <div
                      className="grid grid-cols-3 gap-4"
                      data-id="element-1013"
                    >
                      <div
                        className="col-span-1 text-sm font-medium text-gray-500"
                        data-id="element-1014"
                      >
                        Headers
                      </div>
                      <div
                        className="col-span-2 text-sm text-gray-900"
                        data-id="element-1015"
                      >
                        {formValues.headers || 'N/A'}
                      </div>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-3 gap-4" data-id="element-1019">
                  <div
                    className="col-span-1 text-sm font-medium text-gray-500"
                    data-id="element-1020"
                  >
                    Table Name
                  </div>
                  <div
                    className="col-span-2 text-sm text-gray-900"
                    data-id="element-1021"
                  >
                    {formValues.targetTable}
                  </div>
                </div>
              </>
            ) : (
              // PUSH Configuration Summary
              <>
                {/*API Endpoint*/}
                <div className="grid grid-cols-3 gap-4" data-id="element-1022">
                  <div
                    className="col-span-1 text-sm font-medium text-gray-500"
                    data-id="element-1023"
                  >
                    API Endpoint
                  </div>
                  <div
                    className="col-span-2 text-sm text-gray-900"
                    data-id="element-1024"
                  >
                    {generateEndpointUrl(
                      formValues.version,
                      formValues.endpointPath,
                    )}
                  </div>
                </div>
                {/* Table Name */}
                <div className="grid grid-cols-3 gap-4" data-id="element-1028">
                  <div
                    className="col-span-1 text-sm font-medium text-gray-500"
                    data-id="element-1029"
                  >
                    Table Name
                  </div>
                  <div
                    className="col-span-2 text-sm text-gray-900"
                    data-id="element-1030"
                  >
                    {formValues.targetTable}
                  </div>
                </div>
              </>
            )}
            {/* Ingest Mode */}
            <div className="grid grid-cols-3 gap-4" data-id="element-1025">
              <div
                className="col-span-1 text-sm font-medium text-gray-500"
                data-id="element-1026"
              >
                Ingest Mode
              </div>
              <div
                className="col-span-2 text-sm text-gray-900 capitalize"
                data-id="element-1027"
              >
                {formValues.ingestMode}
              </div>
            </div>
          </div>
        </div>

        {createSuccess && (
          <div
            className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded"
            data-id="success-message"
          >
            {createSuccess}
          </div>
        )}
      </div>
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === 'configurationType') {
      setConfigurationType(value as 'pull' | 'push');
    }

    // If switching source type, clear irrelevant fields
    if (name === 'sourceType') {
      const updatedFormData = { ...formData };

      if (value === 'http') {
        // Clear SFTP-specific fields when switching to HTTP
        updatedFormData.port = '';
        updatedFormData.username = '';
        updatedFormData.password = '';
        updatedFormData.authType = 'password';
        updatedFormData.privateKey = '';
        updatedFormData.pathPattern = '';
        updatedFormData.fileFormat = 'csv';
        updatedFormData.delimiter = ',';
      } else if (value === 'sftp') {
        // Clear HTTP-specific fields when switching to SFTP (none currently)
        // Set default auth type for SFTP
        updatedFormData.authType = 'password';
      }

      updatedFormData[name] = value;
      setFormData(updatedFormData);
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleContinue = () => {
    setShowConfigForm(true);
  };

  const handleSave = async () => {
    try {
      setIsCreating(true);
      setCreateError(null);
      setCreateSuccess(null);
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

        if (formValues.sourceType === 'https') {
          // HTTPS Pull configuration
          let headers;
          try {
            headers = formValues.headers
              ? JSON.parse(formValues.headers)
              : { 'content-type': 'application/json' };
          } catch {
            headers = { 'content-type': 'application/json' };
          }

          payload = {
            ...basePayload,
            source_type: 'HTTPS' as const,
            connection: {
              url: formValues.url,
              headers,
            },
          };
        } else {
          // SFTP Pull configuration
          payload = {
            ...basePayload,
            source_type: 'SFTP' as const,
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
              path: formValues.pathPattern || '/data.csv',
              file_type: formValues.fileFormat.toUpperCase() as
                | 'CSV'
                | 'JSON'
                | 'TSV',
              delimiter: formValues.delimiter || ',',
            },
          };
        }
      }

      // Call appropriate API based on mode and configuration type
      let response;
      if (editMode && jobId) {
        response =
          configurationType === 'pull'
            ? await dataEnrichmentApi.updatePullJob(jobId, payload)
            : await dataEnrichmentApi.updatePushJob(jobId, payload);
      } else {
        response =
          configurationType === 'pull'
            ? await dataEnrichmentApi.createPullJob(payload)
            : await dataEnrichmentApi.createPushJob(payload);
      }

      const successMessage = editMode
        ? `Data enrichment endpoint "${formValues.name}" updated successfully!`
        : `Data enrichment endpoint "${formValues.name}" created successfully! You can now send it for approval.`;

      setCreateSuccess(successMessage);
      onSave(response);

      // Close modal after showing success message
      setTimeout(() => {
        onClose();
      }, 1500);
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

      setCreateError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

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

          {!showConfigForm ? (
            /* PUSH PULL SELECTION */
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '500px',
                padding: 6,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  fontSize: { xs: '20px', sm: '24px', md: '28px' },
                  fontWeight: 'bold',
                  color: '#3b3b3b',
                  marginBottom: 4,
                }}
              >
                Please Select Configuration Type
                <Box
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  <LassoSelect size={28} color="#36ce9f" />
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 4,
                  width: '100%',
                  maxWidth: '700px',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Pull Box */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    border: `2px solid ${configurationType === 'pull' ? '#3b82f6' : '#e5e7eb'}`,
                    borderRadius: 2,
                    backgroundColor:
                      configurationType === 'pull' ? '#eff6ff' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    position: 'relative',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      backgroundColor: '#eff6ff',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                    },
                  }}
                  onClick={() => {
                    setConfigurationType('pull');
                    setFormData({
                      ...formData,
                      configurationType: 'pull',
                    });
                  }}
                >
                  {/* Hidden radio input */}
                  <input
                    type="radio"
                    name="configurationType"
                    value="pull"
                    checked={configurationType === 'pull'}
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                  />

                  {/* Selection circle */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                    }}
                  >
                    {configurationType === 'pull' ? (
                      <CheckCircleIcon size={20} color="#3b82f6" />
                    ) : (
                      <Circle size={20} color="#d1d5db" />
                    )}
                  </Box>

                  <DownloadIcon size={48} color="#3b82f6" />
                  <Box
                    sx={{
                      marginTop: 2,
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#374151',
                    }}
                  >
                    PULL
                  </Box>
                  <Box
                    sx={{
                      marginTop: 1,
                      fontSize: '13px',
                      color: '#6b7280',
                      textAlign: 'center',
                      lineHeight: 1.4,
                    }}
                  >
                    Pull configuration allows you to fetch data from external
                    sources like SFTP or HTTP endpoints.
                  </Box>
                </Box>

                {/* Push Box */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    border: `2px solid ${configurationType === 'push' ? '#8b5cf6' : '#e5e7eb'}`,
                    borderRadius: 2,
                    backgroundColor:
                      configurationType === 'push' ? '#f5f3ff' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    position: 'relative',
                    '&:hover': {
                      borderColor: '#8b5cf6',
                      backgroundColor: '#f5f3ff',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.15)',
                    },
                  }}
                  onClick={() => {
                    setConfigurationType('push');
                    setFormData({
                      ...formData,
                      configurationType: 'push',
                    });
                  }}
                >
                  {/* Hidden radio input */}
                  <input
                    type="radio"
                    name="configurationType"
                    value="push"
                    checked={configurationType === 'push'}
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                  />

                  {/* Selection circle */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                    }}
                  >
                    {configurationType === 'push' ? (
                      <CheckCircleIcon size={20} color="#8b5cf6" />
                    ) : (
                      <Circle size={20} color="#d1d5db" />
                    )}
                  </Box>

                  <UploadIcon size={48} color="#8b5cf6" />
                  <Box
                    sx={{
                      marginTop: 2,
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#374151',
                    }}
                  >
                    PUSH
                  </Box>
                  <Box
                    sx={{
                      marginTop: 1,
                      fontSize: '13px',
                      color: '#6b7280',
                      textAlign: 'center',
                      lineHeight: 1.4,
                    }}
                  >
                    Push configuration creates a REST API endpoint where
                    external systems can send data to your system.
                  </Box>
                </Box>
              </Box>

              {/* Footer with Continue Button */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: 4,
                  paddingX: 6,
                }}
              >
                <Button
                  variant="contained"
                  onClick={handleContinue}
                  disabled={!configurationType}
                  sx={{ backgroundColor: '#2b7fff' }}
                >
                  Continue
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              {/* REACT HOOK FORM */}
              {currentStep === 'config' ? (
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
                          <DownloadIcon
                            size={20}
                            className="mr-2 text-blue-500"
                          />
                          Pull Configuration (SFTP/HTTP)
                        </>
                      ) : (
                        <>
                          <UploadIcon
                            size={20}
                            className="mr-2 text-purple-500"
                          />
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
              ) : currentStep === 'summary' ? (
                <>
                  <div className="max-h-[calc(90vh-280px)] overflow-y-auto px-6 py-4">
                    {renderSummaryStep()}
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
                        sx={{ marginRight: '10px', backgroundColor: '#2b7fff' }}
                        onClick={() => setCurrentStep('config')}
                        startIcon={<ArrowLeft size={16} />}
                      >
                        Back to Config
                      </Button>

                      <Button
                        variant="contained"
                        sx={{ backgroundColor: '#2b7fff' }}
                        onClick={handleSave}
                        startIcon={<Plus size={16} />}
                      >
                        Create Endpoint
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}

          {/* <div
            className="flex justify-between items-center px-6 py-4 border-b border-gray-200"
            data-id="element-1048"
          >
            <h2
              className="text-xl font-semibold text-gray-800"
              data-id="element-1049"
            >
              Define New Data Enrichment Endpoint
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              data-id="element-1050"
            >
              <XIcon size={24} data-id="element-1051" />
            </button>
          </div>
          <div
            className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]"
            data-id="element-1052"
          >
            {isLoadingJob ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading job data...</span>
              </div>
            ) : (
              <>
                {currentStep === 'config' && renderConfigStep()}
                {currentStep === 'preview' && renderPreviewStep()}
                {currentStep === 'summary' && renderSummaryStep()}
              </>
            )}
          </div> */}
          {/* FOOTER */}
          {/* <div
            className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center"
            data-id="sticky-footer"
          >
            <Button
              variant="secondary"
              onClick={onClose}
              data-id="cancel-button"
            >
              Cancel
            </Button>

            <div className="flex space-x-3" data-id="right-buttons">
              {currentStep === 'config' && (
                <>
                  {!isFormValid() ? (
                    <div title="Please fill all required fields">
                      <Button
                        variant="primary"
                        onClick={handleTestRun}
                        disabled={true}
                      >
                        {isTestingConnection
                          ? 'Testing Connection...'
                          : 'Save and Next'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleTestRun}
                      disabled={isTestingConnection}
                    >
                      {isTestingConnection
                        ? 'Testing Connection...'
                        : 'Save and Next'}
                    </Button>
                  )}
                </>
              )}

              {currentStep === 'preview' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentStep('config')}
                  >
                    Back to Configuration
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setCurrentStep('summary')}
                  >
                    Continue
                  </Button>
                </>
              )}

              {currentStep === 'summary' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentStep('config')}
                    disabled={isCreating}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={isCreating}
                  >
                    {isCreating ? 'Saving...' : editMode ? 'Save' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div> */}
        </div>
      </Backdrop>
    </div>
  );
};
