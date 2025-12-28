import { useAuth } from '@features/auth';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Grid,
} from '@mui/material';
import Alert from '@mui/material/Alert';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import { DownloadIcon, Loader2, Save, UploadIcon, XIcon } from 'lucide-react';
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
import { useToast } from '../../../../shared/providers/ToastProvider';
import { saveDataEnrichmentJob } from '../../handlers';
import { loadSchedules as loadCronSchedules } from '../../../cron/handlers';
import {
  handleUpdateConfirm as confirmUpdate,
  handleEditSendForApprovalConfirm,
} from '../../handlers';
import { scrollToFirstError } from '../../utils';
import type { ScheduleResponse } from '../../types';
import { getJobType } from '../../utils';
import {
  authenticationTypeOptions,
  defaultValues,
  fileFormatOptions,
  getAssociatedScheduleOptions,
  ingestModeOptions,
  pullValidationSchema,
  pushValidationSchema,
  sourceTypeOptions,
} from '../validationSchema';
import type { DataEnrichmentEditModalProps } from '../../types';
import { DATA_ENRICHMENT_JOB_STATUSES } from '../../constants';

export const DataEnrichmentEditModal: React.FC<
  DataEnrichmentEditModalProps
  
> = ({
  isOpen,
  onClose,
  onCloseWithRefresh,
  onSave,
  editMode = false,
  selectedJob,
}) => {
  
  const [availableSchedules, setAvailableSchedules] = useState<
    ScheduleResponse[]
  >([]);

  const [isCreating, setIsCreating] = useState(false);
  const [showUpdateConfirmDialog, setShowUpdateConfirmDialog] = useState(false);
  const [showApprovalConfirmDialog, setShowApprovalConfirmDialog] =
    useState(false);
  
  const [showSendForApproval, setShowSendForApproval] = useState(false);

  const tenantId = useAuth()?.user?.tenantId || 'tenantId';
  const { showSuccess, showError } = useToast();

  const currentJobType = getJobType(selectedJob);
  const configurationType = currentJobType as 'pull' | 'push';

  
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

  
  const shouldScrollToErrorRef = useRef(false);

  
  const onError = () => {
    shouldScrollToErrorRef.current = true;
  };

  
  useEffect(() => {
    if (shouldScrollToErrorRef.current && Object.keys(errors).length > 0) {
      shouldScrollToErrorRef.current = false;
      scrollToFirstError(Object.keys(errors)[0]);
    }
  }, [errors]);

  
  const fileFormat = watch('fileFormat');
  useEffect(() => {
    const pathPattern = getValues('pathPattern');
    if (pathPattern) {
      trigger('pathPattern');
    }
  }, [fileFormat, trigger, getValues]);



  const handleSave = async () => {
    try {
      await saveDataEnrichmentJob({
        formValues: getValues(),
        configurationType,
        editMode,
        selectedJob,
        onSave,
        onCloseWithRefresh,
        onClose,
        showSuccess,
        setShowSendForApproval,
        setIsCreating,
      });
    } catch (error) {
      let errorMessage = 'Failed to create endpoint';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const apiError = error as any;
        errorMessage = apiError.message || apiError.error || 'Unknown error occurred';
      }
      showError('Error', errorMessage);
    }
  };

  const handleUpdateConfirm = () => {
    confirmUpdate(() => handleSave(), setShowUpdateConfirmDialog);
  };

  const handleSendForApprovalConfirm = async () => {
    await handleEditSendForApprovalConfirm(
      selectedJob,
      (msg) => showSuccess('Success', msg),
      (msg) => showError('Error', msg),
      () => {
        if (onCloseWithRefresh) onCloseWithRefresh();
        else if (onClose) onClose();
      },
      setShowApprovalConfirmDialog
    );
  };

  const onSubmit = () => {
    handleSave();
  };

  useEffect(() => {
    const loadSchedules = async () => {
      if (!isOpen) return;

      try {
        
        const pageNumber = 1;
        const itemsPerPage = 50;
        const userRole = 'ASSOCIATE'; 
        const searchingFilters = {};
        const result = await loadCronSchedules(pageNumber, itemsPerPage, userRole, searchingFilters);
        const schedules = result?.schedules || result?.data || [];

        
        const filteredSchedules = schedules?.filter(
          (schedule: any) =>
            schedule.status === DATA_ENRICHMENT_JOB_STATUSES.APPROVED ||
            schedule.status === DATA_ENRICHMENT_JOB_STATUSES.EXPORTED,
        );

        setAvailableSchedules(filteredSchedules || []);
      } catch (error) {
        setAvailableSchedules([]);
      }
    };

    loadSchedules();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedJob && editMode) {
      const jobType = getJobType(selectedJob);

      const initialValues: any = {
        name: selectedJob.endpoint_name || '',
        description: selectedJob.description || '',
        version: selectedJob.version || '',
        targetTable: selectedJob.table_name || '',
        ingestMode: selectedJob.mode || 'append',
      };

      if (jobType === 'push') {
        
        let endpointPath = selectedJob.path;

        
        if (endpointPath && !endpointPath.startsWith('/')) {
          endpointPath = '/' + endpointPath;
        }
        initialValues.endpointPath = endpointPath;
      } else {
        
        initialValues.sourceType =
          selectedJob.source_type?.toLowerCase() || 'sftp'; 
        initialValues.schedule = selectedJob.schedule_id || '';

        
        if (selectedJob.connection) {
          if (selectedJob.source_type === 'SFTP') {
            
            initialValues.host = selectedJob.connection.host || '';
            initialValues.port = selectedJob.connection.port?.toString() || '';
            initialValues.authType =
              selectedJob.connection.auth_type === 'PRIVATE_KEY'
                ? 'key'
                : 'password';
            initialValues.username = selectedJob.connection.user_name || '';
            
          } else if (selectedJob.source_type === 'HTTP') {
            
            initialValues.url = selectedJob.connection.url || '';
            initialValues.headers = selectedJob.connection.headers
              ? JSON.stringify(selectedJob.connection.headers, null, 2)
              : '';
          }
        }

        
        if (selectedJob.file) {
          let pathPattern = selectedJob.file.path || '';

          
          if (pathPattern && !pathPattern.startsWith('/')) {
            pathPattern = '/' + pathPattern;
          }
          initialValues.pathPattern = pathPattern;
          initialValues.fileFormat =
            selectedJob.file.file_type?.toLowerCase() || 'csv'; 
          initialValues.delimiter = selectedJob.file.delimiter || ',';
        }
      }

      
      Object.entries(initialValues).forEach(([key, value]) => {
        setValue(key, value);
      });

      }
  }, [isOpen, selectedJob, editMode, setValue]);

  const RenderPullConfigForm = () => (
    <div className="space-y-6" data-id="element-818">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <EndpointNameInputField
            name="name"
            control={control}
            disabled={true}
            label={
              <>
                Connector Name <span className="text-red-500">*</span>
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
            disabled={true}
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
            {watch('authType') === 'key' ? (
              <MultiLineTextInputField
                name="password"
                control={control}
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
                type="text"
                placeholder="Enter Password"
              />
            )}
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
            disabled={true}
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
                Connector Name <span className="text-red-500">*</span>
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
            disabled={true}
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
            disabled={true}
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
              let endpointPath = watch('endpointPath') || '';

              
              const cleanVersion =
                version?.replace(/^v?\/*/g, '').replace(/\/+$/g, '') || '';

              
              const prefixRegex = new RegExp(
                `^/?${tenantId}/enrichment(/v?${cleanVersion.replace(/\./g, '\\.')})?`,
                'i',
              );
              endpointPath = endpointPath.replace(prefixRegex, '');

              
              const cleanPath = endpointPath.startsWith('/')
                ? endpointPath
                : `/${endpointPath}`;

              if (!version && !endpointPath.trim()) {
                return `/${tenantId}/enrichment/{version}{path}`;
              }

              const versionPart = cleanVersion
                ? `/${cleanVersion}`
                : '/{version}';
              const pathPart = endpointPath.trim() ? cleanPath : '/{path}';

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
            disabled={true}
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
                  {!showSendForApproval && (
                    <Button
                      variant="contained"
                      sx={{ backgroundColor: '#2b7fff' }}
                      type="button"
                      disabled={isCreating}
                      startIcon={
                        isCreating ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Save size={16} />
                        )
                      }
                      onClick={async () => {
                        const valid = await trigger();
                        if (valid) {
                          setShowUpdateConfirmDialog(true);
                        } else {
                          const firstError = Object.keys(errors)[0];
                          if (firstError) scrollToFirstError(firstError);
                        }
                      }}
                    >
                      {isCreating ? 'Updating...' : 'Update'}
                    </Button>
                  )}
                  {showSendForApproval && !isCreating && (
                    <Button
                      type="button"
                      variant="contained"
                      sx={{ backgroundColor: '#2b7fff', ml: 2 }}
                      onClick={() => setShowApprovalConfirmDialog(true)}
                      startIcon={<UploadIcon size={16} />}
                      disabled={false}
                    >
                      Send for Approval
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </>
        </div>
      </Backdrop>

      
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

      
      <Dialog
        open={showUpdateConfirmDialog}
        onClose={() => setShowUpdateConfirmDialog(false)}
        aria-labelledby="update-confirmation-dialog-title"
        aria-describedby="update-confirmation-dialog-description"
        sx={{ borderRadius: '6px' }}
      >
        <Box
          sx={{
            color: '#3B3B3B',
            fontSize: '20px',
            fontWeight: 'bold',
            padding: '16px 20px',
            borderBottom: '1px solid #CECECE',
          }}
        >
          Update Confirmation Required!
        </Box>
        <DialogContent sx={{ padding: '20px 20px' }}>
          <DialogContentText
            id="update-confirmation-dialog-description"
            sx={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#374151',
              marginBottom: '16px',
            }}
          >
            Are you sure you want to update{' '}
            <Box
              component="span"
              sx={{
                fontWeight: 'bold',
                color: '#2B7FFF',
                backgroundColor: '#F0F7FF',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '15px',
              }}
            >
              "{watch('name') || selectedJob?.endpoint_name || 'this endpoint'}"
            </Box>
            ?
          </DialogContentText>
          <Box
            sx={{
              backgroundColor: '#DCEEFF',
              border: '1px solid #DCEEFF',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '16px',
            }}
          >
            <DialogContentText
              sx={{
                fontSize: '16px',
                color: '#2B7FFF',
                margin: 0,
                fontWeight: '500',
              }}
            >
              ⚠️ Important: This will modify the existing data enrichment
              endpoint configuration. Make sure all changes are correct before
              proceeding.
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
          <Button
            onClick={() => setShowUpdateConfirmDialog(false)}
            variant="outlined"
            className="pb-1.5! pt-[5px]!"
            size="small"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateConfirm}
            variant="contained"
            color="primary"
            className="pb-1.5! pt-[5px]!"
            autoFocus
            size="small"
          >
            Yes, Update Configuration
          </Button>
        </DialogActions>
      </Dialog>

      
      <Dialog
        open={showApprovalConfirmDialog}
        onClose={() => setShowApprovalConfirmDialog(false)}
        aria-labelledby="approval-confirmation-dialog-title"
        aria-describedby="approval-confirmation-dialog-description"
        sx={{ borderRadius: '6px' }}
      >
        <Box
          sx={{
            color: '#3B3B3B',
            fontSize: '20px',
            fontWeight: 'bold',
            padding: '16px 20px',
            borderBottom: '1px solid #CECECE',
          }}
        >
          Approval Confirmation Required!
        </Box>
        <DialogContent sx={{ padding: '20px 20px' }}>
          <DialogContentText
            id="approval-confirmation-dialog-description"
            sx={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#374151',
              marginBottom: '16px',
            }}
          >
            Are you sure you want to send{' '}
            <Box
              component="span"
              sx={{
                fontWeight: 'bold',
                color: '#2B7FFF',
                backgroundColor: '#F0F7FF',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '15px',
              }}
            >
              "{selectedJob?.endpoint_name || 'this job'}"
            </Box>
            for approval?
          </DialogContentText>
          <Box
            sx={{
              backgroundColor: '#DCEEFF',
              border: '1px solid #DCEEFF',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '16px',
            }}
          >
            <DialogContentText
              sx={{
                fontSize: '16px',
                color: '#2B7FFF',
                margin: 0,
                fontWeight: '500',
              }}
            >
              ⚠️ Important: Once sent, the job will be reviewed by an approver
              and you won't be able to make changes until it's either approved
              or rejected.
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: '12px 20px 16px 20px' }}>
          <Button
            onClick={() => setShowApprovalConfirmDialog(false)}
            variant="outlined"
            className="pb-1.5! pt-[5px]!"
            disabled={isCreating}
            size="small"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendForApprovalConfirm}
            variant="contained"
            color="primary"
            className="pb-1.5! pt-[5px]!"
            autoFocus
            disabled={isCreating}
            size="small"
          >
            {isCreating ? 'Sending...' : 'Yes, Send for Approval'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
