import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Grid, Button } from '@mui/material';
import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Cron } from 'react-js-cron';
import 'react-js-cron/dist/styles.css';
import * as yup from 'yup';
import {
  NumberInputField,
  TextInputField,
  // @ts-ignore - FormFields is a .jsx file without TypeScript declarations
} from '../../../shared/components/FormFields';
import ValidationError from '../../../shared/components/ValidationError';
import { useToast } from '../../../shared/providers/ToastProvider';
import { dataEnrichmentApi } from '@features/data-enrichment/services';
import { isApprover } from '@utils/roleUtils';
import { useAuth } from '@features/auth';
import cronstrue from 'cronstrue';

// Validation schema
const validationSchema = yup.object().shape({
  name: yup
    .string()
    .required('Job name is required')
    .min(2, 'Job name must be at least 2 characters')
    .max(50, 'Job name must not exceed 50 characters'),
  cronExpression: yup.string().required('Cron expression is required'),
  iterations: yup
    .number()
    .transform((value, originalValue) => {
      // Handle empty string or null values
      if (
        originalValue === '' ||
        originalValue === null ||
        originalValue === undefined
      ) {
        return undefined;
      }
      return value;
    })
    .required('Iterations is required')
    .min(1, 'Iterations must be at least 1')
    .max(1000, 'Iterations must not exceed 1000')
    .integer('Iterations must be a whole number'),
});

// Default values
const defaultValues = {
  name: '',
  cronExpression: '',
  iterations: 1,
  startDate: '2025-11-18',
  endDate: '2025-12-31',
};

interface CronJobFormProps {
  onJobCreated?: () => void;
  onCancel?: () => void;
  viewFormData?: any;
  editFormData?: any;
  setEditFormData?: any;
  handleSendForApproval?: () => void;
  handleSaveEdit?: () => void;
  onApprove?: (scheduleId: string) => void;
  onReject?: (scheduleId: string) => void;
}

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

  // React Hook Form setup
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

  // Ref to track if we're in edit mode initialization
  const isInitializing = useRef(false);

  useEffect(() => {
    if (editFormData) {
      reset(editFormData);
    }

    if (viewFormData) {
      reset({
        ...viewFormData,
        cronExpression: viewFormData.cron || viewFormData.cronExpression,
      });
    }
  }, [editFormData, viewFormData]);

  // Update editFormData when form values change (only in edit mode)
  // Using individual field watches to avoid infinite loop
  useEffect(() => {
    if (editFormData && setEditFormData && !isInitializing.current) {
      const subscription = watch((values) => {
        // Deep comparison to avoid unnecessary updates
        const isDifferent =
          JSON.stringify(values) !== JSON.stringify(editFormData);
        if (isDifferent) {
          setEditFormData(values);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [editFormData, setEditFormData, watch]);

  // Form submission handler
  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      // Create schedule using data-enrichment-service API
      const scheduleData: any = {
        name: data.name.trim(),
        cron: data.cronExpression.trim(),
        iterations: data.iterations,
        start_date: data.startDate,
      };

      const response = await dataEnrichmentApi.createSchedule(scheduleData);
      console.log('Schedule created successfully:', response);
      // Show success message using the job name from the form
      const scheduleName = data.name.trim();
      showSuccess(`Schedule "${scheduleName}" created successfully!`);
      onJobCreated?.();
    } catch (error: any) {
      console.error('Failed to create schedule:', error);
      // Provide user-friendly error messages based on error type
      let errorMessage =
        'We encountered an issue while creating your schedule. Please try again.';
      if (error?.response?.status === 400) {
        errorMessage =
          'The CRON expression or job details are invalid. Please check your input and try again.';
      } else if (error?.response?.status === 409) {
        errorMessage =
          'A schedule with this name already exists. Please choose a different name.';
      } else if (
        error?.response?.status === 401 ||
        error?.response?.status === 403
      ) {
        errorMessage =
          'You do not have permission to create schedules. Please contact your administrator.';
      } else if (error?.response?.status >= 500) {
        errorMessage =
          'Our service is temporarily unavailable. Please try again in a few minutes.';
      } else if (
        error?.message?.includes('fetch') ||
        error?.message?.includes('network')
      ) {
        errorMessage =
          'Unable to connect to the service. Please check your internet connection and try again.';
      }
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Box>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Job Name Input */}
          <Grid size={{ xs: 12 }}>
            <TextInputField
              label="Job Name *"
              name="name"
              control={control}
              placeholder="Enter job name"
              maxLength={50}
              disabled={Boolean(viewFormData)}
            />
            {errors?.name && (
              <ValidationError
                message={errors?.name?.message || 'Invalid input'}
              />
            )}
          </Grid>
        </Grid>

        {/* ReactJS Cron Visual Builder */}
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
                {/* Display Generated Expression and Description */}
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
                    errors.cronExpression.message || 'Invalid cron expression'
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
                  errors?.iterations?.message || 'Invalid number of iterations'
                }
              />
            )}
          </Grid>
        </Grid>

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
                onClick={onCancel}
                disabled={isSubmitting}
                variant="outlined"
                sx={{
                  px: 2,
                  py: 1,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textTransform: 'none',
                }}
              >
                Cancel
              </Button>
              {viewFormData?.status === 'STATUS_03_UNDER_REVIEW' &&
                userIsApprover &&
                (onApprove || onReject) && (
                  <div className="flex gap-3">
                    {onReject && (
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
                        }}
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
                        color="primary"
                        sx={{
                          px: 2,
                          py: 1,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          textTransform: 'none',
                        }}
                        onClick={() => {
                          onApprove(viewFormData?.id);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Approve
                      </Button>
                    )}
                  </div>
                )}
              {viewFormData &&
                viewFormData?.status === 'STATUS_01_IN_PROGRESS' && (
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
