import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
} from '@mui/material';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import { DownloadIcon, Loader2, Save, UploadIcon, XIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '../../../../shared/providers/ToastProvider';
import { saveDataEnrichmentJob ,
  handleUpdateConfirm as confirmUpdate,
  handleEditSendForApprovalConfirm,
  loadSchedules,
} from '../../handlers';

import { scrollToFirstError , getJobType } from '../../utils';
import type { ScheduleResponse , DataEnrichmentEditModalProps } from '../../types';

// @ts-ignore - JS module without types
import * as validationSchema from '../validationSchema';
import PullConfigForm from '../PullConfigForm';
import PushConfigForm from '../PushConfigForm';

import { DATA_ENRICHMENT_JOB_STATUSES } from '../../constants';
const {
  defaultValues,
  pullValidationSchema,
  pushValidationSchema,
} = (validationSchema as any) ?? {};

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
  const { showSuccess, showError } = useToast();

  const currentJobType = getJobType(selectedJob);
  const configurationType = currentJobType;
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
        errorMessage = apiError.message ?? apiError.error ?? 'Unknown error occurred';
      }
      showError('Error', errorMessage);
    }
  };

  const handleUpdateConfirm = () => {
    confirmUpdate(async () => { await handleSave(); }, setShowUpdateConfirmDialog);
  };

  const handleSendForApprovalConfirm = async () => {
    await handleEditSendForApprovalConfirm(
      selectedJob,
      (msg) => { showSuccess('Success', msg); },
      (msg) => { showError('Error', msg); },
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
    const fetchSchedules = async () => {
      if (!isOpen) return;

      try {
        const schedulesResp = await loadSchedules();
        const scheduleData: any[] = Array.isArray(schedulesResp)
          ? schedulesResp
          : (schedulesResp as any)?.data || (schedulesResp as any)?.results || (schedulesResp as any)?.items || [];

        const filteredSchedules = scheduleData.filter(
          (schedule: any) =>
            schedule?.status === DATA_ENRICHMENT_JOB_STATUSES.APPROVED ||
            schedule?.status === DATA_ENRICHMENT_JOB_STATUSES.EXPORTED,
        );

        setAvailableSchedules(filteredSchedules);

        if (editMode && selectedJob?.schedule_id) {
          setValue('schedule', selectedJob.schedule_id);
        }
      } catch (error) {
        setAvailableSchedules([]);
      }
    };

    fetchSchedules();
  }, [isOpen, editMode, selectedJob, setValue]);

  useEffect(() => {
    if (isOpen && selectedJob && editMode) {
      const jobType = getJobType(selectedJob);

      const initialValues: any = {
        name: selectedJob.endpoint_name ?? '',
        description: selectedJob.description ?? '',
        version: selectedJob.version ?? '',
        targetTable: selectedJob.table_name ?? '',
        ingestMode: selectedJob.mode ?? 'append',
      };

      if (jobType === 'push') {
        
        let endpointPath = selectedJob.path;

        
        if (endpointPath && !endpointPath.startsWith('/')) {
          endpointPath = '/' + endpointPath;
        }
        initialValues.endpointPath = endpointPath;
      } else {
        
        initialValues.sourceType =
          selectedJob.source_type?.toLowerCase() ?? 'sftp'; 
        initialValues.schedule = selectedJob.schedule_id ?? '';

        
        if (selectedJob.connection) {
          if (selectedJob.source_type === 'SFTP') {
            
            initialValues.host = selectedJob.connection.host ?? '';
            initialValues.port = selectedJob.connection.port?.toString() ?? '';
            initialValues.authType =
              selectedJob.connection.auth_type === 'PRIVATE_KEY'
                ? 'key'
                : 'password';
            initialValues.username = selectedJob.connection.user_name ?? '';
            
          } else if (selectedJob.source_type === 'HTTP') {
            
            initialValues.url = selectedJob.connection.url ?? '';
            initialValues.headers = selectedJob.connection.headers
              ? JSON.stringify(selectedJob.connection.headers, null, 2)
              : '';
          }
        }

        
        if (selectedJob.file) {
          let pathPattern = selectedJob.file.path ?? '';

          
          if (pathPattern && !pathPattern.startsWith('/')) {
            pathPattern = '/' + pathPattern;
          }
          initialValues.pathPattern = pathPattern;
          initialValues.fileFormat =
            selectedJob.file.file_type?.toLowerCase() ?? 'csv'; 
          initialValues.delimiter = selectedJob.file.delimiter ?? ',';
        }
      }

      
      Object.entries(initialValues).forEach(([key, value]) => {
        setValue(key, value);
      });

      }
  }, [isOpen, selectedJob, editMode, setValue]);

  const RenderPullConfigForm = () => (
    <PullConfigForm control={control} watch={watch} errors={errors} availableSchedules={availableSchedules} />
  );

  const renderPushConfigForm = () => (
    <PushConfigForm control={control} watch={watch} errors={errors} />
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
                      onClick={() => { setShowApprovalConfirmDialog(true); }}
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
        onClose={() => { setShowUpdateConfirmDialog(false); }}
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
              "{watch('name') ?? selectedJob?.endpoint_name ?? 'this endpoint'}"
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
            onClick={() => { setShowUpdateConfirmDialog(false); }}
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
        onClose={() => { setShowApprovalConfirmDialog(false); }}
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
              "{selectedJob?.endpoint_name ?? 'this job'}"
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
            onClick={() => { setShowApprovalConfirmDialog(false); }}
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
