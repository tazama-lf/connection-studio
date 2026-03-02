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
  Loader2,
  Plus,
  Save,
  UploadIcon,
  XIcon,
} from 'lucide-react';
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
} from '../../../../shared/components/FormFields';
import ValidationError from '../../../../shared/components/ValidationError';
import { dataEnrichmentJobApi as dataEnrichmentApi, scheduleApi ,
  handleFormInputChange,
  handleContinue as continueForm,
} from '../../handlers';

import type { ScheduleResponse , DataEnrichmentFormModalProps } from '../../types';
// @ts-ignore - JS module without types
import * as validationSchema from '../validationSchema';
import { DATA_ENRICHMENT_JOB_STATUSES } from '../../constants';

const {
  authenticationTypeOptions,
  defaultValues,
  fileFormatOptions,
  getAssociatedScheduleOptions,
  ingestModeOptions,
  pullValidationSchema,
  pushValidationSchema,
  sourceTypeOptions,
} = (validationSchema as any) || {};

export const DataEnrichmentFormModal: React.FC<
  DataEnrichmentFormModalProps
  
> = ({ isOpen, onClose, onSave, editMode = false, jobId, jobType }) => {
  
  const [currentStep, setCurrentStep] = useState<
    'config' | 'preview' | 'summary'
  >('config');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configurationType, setConfigurationType] = useState<'pull' | 'push'>(
    jobType || 'pull',
  );
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [availableSchedules, setAvailableSchedules] = useState<
    ScheduleResponse[]
  >([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  

  const tenantId = useAuth()?.user?.tenantId ?? 'tenantId';
  
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

  const shouldScrollToErrorRef = useRef(false);
  
  const errorMessageRef = useRef<HTMLDivElement>(null);

  
  const onError = () => {
    shouldScrollToErrorRef.current = true;
  };

  
  const generateEndpointUrl = (version?: string, endpointPath?: string) => {
    
    const cleanVersion =
      version?.replace(/^v?\/*/g, '').replace(/\/+$/g, '') || '';

    
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

  
  useEffect(() => {
    if (shouldScrollToErrorRef.current && Object.keys(errors).length > 0) {
      shouldScrollToErrorRef.current = false;
      scrollToFirstError(Object.keys(errors)[0]);
    }
  }, [errors]);

  
  useEffect(() => {
    if (createError && errorMessageRef.current) {
      errorMessageRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, [createError]);

  
  const fileFormat = watch('fileFormat');
  useEffect(() => {
    const pathPattern = getValues('pathPattern');
    if (pathPattern) {
      trigger('pathPattern');
    }
  }, [fileFormat, trigger, getValues]);

  
  const scrollToFirstError = (fieldName: string) => {
    const errorElement = document.querySelector(
      `[name="${fieldName}"]`,
    )!;
    if (errorElement) {
      
      const modalContent =
        errorElement.closest('.MuiDialog-paper') ||
        errorElement.closest('.MuiModal-root') ||
        errorElement.closest('[role="dialog"]') ||
        document.querySelector('.MuiDialog-paper');

      if (modalContent) {
        
        errorElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      } else {
        
        errorElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }

      
      setTimeout(() => {
        errorElement.focus();
      }, 300);
    }
  };

  
  const onSubmit = () => {
    setCurrentStep('summary');
  };

  

  
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

  
  useEffect(() => {
    if (!isOpen) {
      setShowConfigForm(false);
    }
  }, [isOpen]);

  
  useEffect(() => {
    if (isOpen) {
      
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    } else {
      
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }, [isOpen]);

  
  useEffect(() => {
    const loadSchedules = async () => {
      if (!isOpen) return;

      try {
        setSchedulesLoading(true);
        const schedulesResp = await scheduleApi.getAll();
        const schedule_data: any[] = Array.isArray(schedulesResp)
          ? schedulesResp
          : (schedulesResp as any)?.data || (schedulesResp as any)?.results || (schedulesResp as any)?.items || [];

        const filteredSchedules = (schedule_data || []).filter((schedule: any) =>
          schedule?.status === DATA_ENRICHMENT_JOB_STATUSES.APPROVED ||
          schedule?.status === DATA_ENRICHMENT_JOB_STATUSES.EXPORTED,
        );

        setAvailableSchedules(filteredSchedules || []);
      } catch (error) {
        setAvailableSchedules([]);
      } finally {
        setSchedulesLoading(false);
      }
    };

    loadSchedules();
  }, [isOpen]);

  
  useEffect(() => {
    const loadJobData = async () => {
      if (!isOpen || !editMode || !jobId) {
        return;
      }

      try {
        setIsLoadingJob(true);
        setCreateError(null);

        const job = await dataEnrichmentApi.getById(
          jobId,
          jobType?.toUpperCase() as 'PULL' | 'PUSH',
        );

        
        
        const detectedConfigType =
          jobType ||
          ((job.config_type || job.type)?.toLowerCase() as 'pull' | 'push');

        
        const isPushJob = job.path && !job.source_type;
        const finalConfigType = isPushJob ? 'push' : detectedConfigType;

        setFormData((prev) => ({
          ...prev,
          name: job.endpoint_name,
          description: job.description || '',
          configurationType: finalConfigType,
          sourceType: job.source_type?.toLowerCase() || 'sftp',
          
          targetTable: job.table_name || '',
        }));

        if (job.schedule_id) {
          // schedule id exists on job; we track schedules in availableSchedules
        }

        setConfigurationType(finalConfigType);
      } catch (error) {
        setCreateError('Failed to load job data. Please try again.');
      } finally {
        setIsLoadingJob(false);
      }
    };

    loadJobData();
  }, [isOpen, editMode, jobId, jobType]);

  
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
                Connector Name <span className="text-red-500">*</span>
              </>
            }
            placeholder="only a-z, 0-9, _, - are allowed"
          />
          {errors?.name && <ValidationError message={String(errors?.name?.message || '')} />}
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
            <ValidationError message={String(errors?.version?.message || '')} />
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
            <ValidationError message={String(errors?.sourceType?.message || '')} />
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
            <ValidationError message={String(errors?.description?.message || '')} />
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
            <ValidationError message={String(errors?.schedule?.message || '')} />
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
              placeholder=""
            />
            {errors?.host && (
              <ValidationError message={String(errors?.host?.message || '')} />
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
              <ValidationError message={String(errors?.port?.message || '')} />
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
              <ValidationError message={String(errors?.authType?.message || '')} />
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
              <ValidationError message={String(errors?.username?.message || '')} />
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            {watch('authType') === 'key' ? (
              <MultiLineTextInputField
                name="password"
                control={control}
                maxLength={500}
                label={
                  <>
                    Private Key <span className="text-red-500">*</span>
                  </>
                }
                placeholder="Enter Private Key"
                rows={4}
              />
            ) : (
              <PasswordInputField
                name="password"
                control={control}
                label={
                  <>
                    Password <span className="text-red-500">*</span>
                  </>
                }
                placeholder="Enter Password"
              />
            )}
            {errors?.password && (
              <ValidationError message={String(errors?.password?.message || '')} />
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
              placeholder="https://dummyjson.com/users"
            />
            {errors?.url && <ValidationError message={String(errors?.url?.message || '')} />}
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
              <ValidationError message={String(errors?.headers?.message || '')} />
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
                <ValidationError message={String(errors?.pathPattern?.message || '')} />
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
                <ValidationError message={String(errors?.fileFormat?.message || '')} />
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
                  placeholder=","
                />
                {errors?.delimiter && (
                  <ValidationError message={String(errors?.delimiter?.message || '')} />
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
            label={
              <>
                Table Name <span className="text-red-500">*</span>
              </>
            }
            placeholder="e.g: customers_2025"
          />
          {errors?.targetTable && (
            <ValidationError message={String(errors?.targetTable?.message || '')} />
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
            <ValidationError message={String(errors?.ingestMode?.message || '')} />
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
                Connector Name <span className="text-red-500">*</span>
              </>
            }
            placeholder="only a-z, 0-9, _, - are allowed"
          />
          {errors?.name && <ValidationError message={String(errors?.name?.message || '')} />}
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
            <ValidationError message={String(errors?.version?.message || '')} />
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
            <ValidationError message={String(errors?.endpointPath?.message || '')} />
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

              
              const cleanVersion =
                version?.replace(/^v?\/*/g, '').replace(/\/+$/g, '') || '';

              
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
            <ValidationError message={String(errors?.description?.message || '')} />
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
            label={
              <>
                Table Name <span className="text-red-500">*</span>
              </>
            }
            placeholder="e.g: customers_2025"
          />
          {errors?.targetTable && (
            <ValidationError message={String(errors?.targetTable?.message || '')} />
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
            <ValidationError message={String(errors?.ingestMode?.message || '')} />
          )}
        </Grid>
      </Grid>
    </div>
  );

  const renderSummaryStep = () => {
    const formValues = getValues(); 
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
            
            <div className="grid grid-cols-3 gap-4" data-id="element-1004">
              <div
                className="col-span-1 text-sm font-medium text-gray-500"
                data-id="element-1005"
              >
                Connector Name
              </div>
              <div
                className="col-span-2 text-sm text-gray-900"
                data-id="element-1006"
              >
                {formValues.name}
              </div>
            </div>
            
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
              
              <>
                
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
          <Alert
            severity="success"
            sx={{ width: '100%', borderRadius: '5px', margin: '16px 0' }}
          >
            {createSuccess}
          </Alert>
        )}

        {createError && (
          <Alert
            ref={errorMessageRef}
            severity="error"
            sx={{ width: '100%', borderRadius: '5px', margin: '16px 0' }}
          >
            {createError}
          </Alert>
        )}
      </div>
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === 'configurationType') {
      setConfigurationType(value as 'pull' | 'push');
    }

    
    if (name === 'sourceType') {
      const updatedFormData = { ...formData };

      if (value === 'http') {
        
        updatedFormData.port = '';
        updatedFormData.username = '';
        updatedFormData.password = '';
        updatedFormData.authType = 'password';
        updatedFormData.privateKey = '';
        updatedFormData.pathPattern = '';
        updatedFormData.fileFormat = 'csv';
        updatedFormData.delimiter = ',';
      } else if (value === 'sftp') {
        
        
        updatedFormData.authType = 'password';
      }

      updatedFormData[name] = value;
      setFormData(updatedFormData);
    } else {
      handleFormInputChange(name, value, setFormData);
    }
  };

  const handleContinue = () => { continueForm(setShowConfigForm); };

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
                : { private_key: formValues.password.replace(/\\n/g, '\n') }), 
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

      
      const backendMessage = (response as any)?.message;
      const successMessage = backendMessage || (editMode
        ? `Data enrichment endpoint "${formValues.name}" updated successfully!`
        : `Data enrichment endpoint "${formValues.name}" created successfully! You can now send it for approval.`);

      setCreateSuccess(successMessage);
      onSave(response);

      
      setTimeout(() => {
        onClose();
      }, 200);
    } catch (error) {
      let errorMessage = 'Failed to create endpoint';

      if (error instanceof Error) {
        
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        
        const apiError = error as any;
        errorMessage = apiError.message ?? apiError.error ?? 'Unknown error occurred';
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
                  
                  <input
                    type="radio"
                    name="configurationType"
                    value="pull"
                    checked={configurationType === 'pull'}
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                  />

                  
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
                  
                  <input
                    type="radio"
                    name="configurationType"
                    value="push"
                    checked={configurationType === 'push'}
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                  />

                  
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
              
              {currentStep === 'config' ? (
                <>
                  
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
                          Pull Configuration (SFTP/HTTPS)
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
                            setCreateError(null);
                            setCreateSuccess(null);
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
                        onClick={() => {
                          setCurrentStep('config');
                          setCreateError(null);
                          setCreateSuccess(null);
                        }}
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
        </div>

        {(isCreating || isLoadingJob || schedulesLoading) && (
          <Backdrop
            sx={(theme) => ({
              color: '#fff',
              zIndex: theme.zIndex.drawer + 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            })}
            open={isCreating || isLoadingJob || schedulesLoading}
          >
            <Loader2 size={48} className="animate-spin" />
            <Box sx={{ fontSize: '16px', fontWeight: 500 }}>
              {isCreating &&
                (editMode ? 'Updating endpoint...' : 'Creating endpoint...')}
              {isLoadingJob && 'Loading job data...'}
              {schedulesLoading && 'Loading schedules...'}
            </Box>
          </Backdrop>
        )}
      </Backdrop>
    </div>
  );
};
