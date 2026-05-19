import React from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import {
  EndpointNameInputField,
  VersionInputField,
  SelectField,
  MultiLineTextInputField,
  HostInputField,
  NumberInputField,
  TextInputField,
  PasswordInputField,
  URLInputField,
  FilePathInputField,
  DelimiterInputField,
  DatabaseTableInputField,
} from '../../../../shared/components/FormFields';
import ValidationError from '../../../../shared/components/ValidationError';
import type { Props } from '../../types';
// @ts-ignore - JS module without types
import * as validationSchema from '../validationSchema';
const {
  authenticationTypeOptions,
  fileFormatOptions,
  getAssociatedScheduleOptions,
  ingestModeOptions,
} = (validationSchema as any) || {};

const PullConfigForm: React.FC<Props> = ({
  control,
  watch,
  errors,
  availableSchedules,
}) => (
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
          options={[
            { label: 'SFTP', value: 'sftp' },
            { label: 'HTTP', value: 'http' },
          ]}
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
          {errors?.host && <ValidationError message={errors?.host?.message} />}
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
          {errors?.port && <ValidationError message={errors?.port?.message} />}
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
          disabled={true}
          label={
            <>
              Table Name <span className="text-red-500">*</span>
            </>
          }
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
          {/* description */}
        </Box>
        {errors?.ingestMode && (
          <ValidationError message={errors?.ingestMode?.message} />
        )}
      </Grid>
    </Grid>
  </div>
);

export default PullConfigForm;
