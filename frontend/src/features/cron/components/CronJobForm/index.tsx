import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Grid, Button } from '@mui/material';
import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Cron } from 'react-js-cron';
import 'react-js-cron/dist/styles.css';
import {
  NumberInputField,
  AlphaNumericInputFieldWithSpaces,
} from '../../../../shared/components/FormFields.jsx'; 
import ValidationError from '../../../../shared/components/ValidationError';
import { useToast } from '../../../../shared/providers/ToastProvider';
import { isApprover } from '@utils/common/roleUtils';
import { useAuth } from '@features/auth';
import cronstrue from 'cronstrue';
import { Check, XCircle } from 'lucide-react';
import type { CronJobFormProps, ScheduleRequest, ScheduleResponse } from '../../types';
import { validationSchema } from '../../utils';
import { submitCronJob, getErrorMessage, CRON_JOB_SUCCESS_MESSAGES } from '../../handlers';
import { CRON_JOB_FORM_DEFAULTS } from '@features/cron/constants';

const defaultValues = CRON_JOB_FORM_DEFAULTS;

export const CronJobForm: React.FC<CronJobFormProps> = ({
  onJobCreated,
  onCancel,
  viewFormData,
  editFormData,
  setEditFormData,
  handleSendForApproval,
  handleSaveEdit,
  onApprove,
  onReject,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const userIsApprover = user?.claims ? isApprover(user.claims) : false;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues,
    mode: 'onChange',
  });

  const cronExpression = watch('cronExpression');

  const isInitializing = useRef(false);

  useEffect(() => {
    if (editFormData) {
      reset(editFormData);
    }

    if (viewFormData) {
      reset({
        ...viewFormData,
        cronExpression: viewFormData.cron ?? '',
      });
    }
  }, [editFormData, viewFormData, reset]);


  useEffect(() => {
    if (editFormData && setEditFormData && !isInitializing.current) {
      const subscription = watch((values) => {
        const isDifferent =
          JSON.stringify(values) !== JSON.stringify(editFormData);
        if (isDifferent) {
          setEditFormData(values as ScheduleResponse);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [editFormData, setEditFormData, watch]);

  const onSubmit = async (data: unknown) => {
    try {
      setIsSubmitting(true);
      await submitCronJob(data);
      const formData = data as ScheduleRequest & { cronExpression?: string };
      const scheduleName = formData.name?.trim() ?? 'Schedule';
      showSuccess(CRON_JOB_SUCCESS_MESSAGES.CREATED(scheduleName));
      onJobCreated?.();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Box>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12 }}>
            <AlphaNumericInputFieldWithSpaces
              label="Job Name *"
              name="name"
              control={control}
              placeholder="Enter job name"
              maxLength={50}
              disabled={Boolean(viewFormData)}
            />
            {errors?.name && (
              <ValidationError
                message={errors?.name?.message ?? 'Invalid input'}
              />
            )}
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ fontWeight: '700', mb: 1 }}>
                Generate Cron Expression <span className="text-red-500">*</span>
              </Box>
              <Box
                sx={{
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  p: 2,
                  bgcolor: '#f9fafb',
                }}
              >
                {!viewFormData && (
                  <Cron
                    value={cronExpression}
                    setValue={(value: string) =>
                      setValue('cronExpression', value)
                    }
                    allowedDropdowns={[
                      'period',
                      'months',
                      'month-days',
                      'week-days',
                      'hours',
                      'minutes',
                    ]}
                    allowedPeriods={['month', 'week', 'day', 'hour', 'minute']}
                    humanizeLabels={true}
                    humanizeValue={true}
                    displayError={true}
                    defaultPeriod="month"
                  />
                )}
                {cronExpression && (
                  <Box sx={{ mb: 1 }}>
                    <span className="text-sm font-medium text-gray-600">
                      Generated Expression:{' '}
                    </span>
                    <Box sx={{ fontSize: '32px', color: '#3b3b3b' }}>
                      {cronExpression}
                    </Box>
                  </Box>
                )}

                <Box sx={{ fontSize: '18px', color: '#3b3b3b' }}>
                  {cronExpression && cronstrue.toString(cronExpression)}
                </Box>
              </Box>

              {errors.cronExpression && (
                <ValidationError
                  message={
                    errors.cronExpression.message ?? 'Invalid cron expression'
                  }
                />
              )}
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <NumberInputField
              name={'iterations'}
              control={control}
              label={
                <>
                  Retry Count <span className="text-red-500">*</span>
                </>
              }
              placeholder="Enter Retry Count"
              maxLength={2}
              disabled={Boolean(viewFormData)}
            />
            {errors?.iterations && (
              <ValidationError
                message={
                  errors?.iterations?.message ?? 'Invalid number of iterations'
                }
              />
            )}
          </Grid>
        </Grid>

        {viewFormData?.comments && (
          <div
            style={{
              margin: '16px 0 16px 0',
              color: '#374151',
              fontSize: 15,
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              padding: '12px 16px',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 4,
                color: '#3b3b3b',
                fontSize: 15,
              }}
            >
              Comments
            </div>
            <div
              style={{ whiteSpace: 'pre-line', fontSize: 15, color: '#374151' }}
            >
              {viewFormData.comments}
            </div>
          </div>
        )}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Button
                type="button"
                variant="outlined"
                sx={{ marginRight: '10px' }}
                startIcon={<XCircle size={16} />}
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {viewFormData?.status === 'STATUS_03_UNDER_REVIEW' &&
                userIsApprover &&
                (onApprove ?? onReject) && (
                  <div className="flex gap-3">
                    {onReject && (
                      <Button
                        type="button"
                        variant="contained"
                        sx={{ marginRight: '10px', backgroundColor: '#ff474d' }}
                        startIcon={<XCircle size={16} />}
                        onClick={() => {
                          onReject(viewFormData?.id);
                        }}
                      >
                        Reject
                      </Button>
                    )}
                    {onApprove && (
                      <Button
                        type="button"
                        variant="contained"
                        sx={{ backgroundColor: '#33ad74' }}
                        startIcon={<Check size={16} />}
                        onClick={() => {
                          onApprove(viewFormData?.id);
                        }}
                      >
                        Approve
                      </Button>
                    )}
                  </div>
                )}
              {viewFormData &&
                (viewFormData?.status === 'STATUS_01_IN_PROGRESS' ||
                  viewFormData?.status === 'STATUS_05_REJECTED') && (
                  <Button
                    type="button"
                    variant="contained"
                    color="primary"
                    sx={{
                      px: 2,
                      py: 1,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      background: '#2b7fff',
                    }}
                    onClick={handleSendForApproval}
                  >
                    Send for Approval
                  </Button>
                )}
              {editFormData && (
                <Button
                  type="button"
                  variant="contained"
                  color="primary"
                  sx={{
                    px: 2,
                    py: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    background: '#2b7fff',
                  }}
                  onClick={handleSaveEdit}
                  title={!isValid ? 'Please fill all required fields' : ''}
                >
                  Update
                </Button>
              )}
              {!editFormData && !viewFormData && (
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{
                    px: 2,
                    py: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    background: '#2b7fff',
                  }}
                  title={!isValid ? 'Please fill all required fields' : ''}
                >
                  {isSubmitting ? 'Creating...' : 'Create Cron Job'}
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default CronJobForm;
