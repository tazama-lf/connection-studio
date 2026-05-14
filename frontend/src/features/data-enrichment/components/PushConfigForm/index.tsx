import React from 'react';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import {
  EndpointNameInputField,
  VersionInputField,
  ApiPathInputField,
  MultiLineTextInputField,
  DatabaseTableInputField,
  SelectField,
} from '../../../../shared/components/FormFields';
import ValidationError from '../../../../shared/components/ValidationError';
// @ts-ignore - JS module without types
import * as validationSchema from '../validationSchema';
import type { PropsPush } from '@features/data-enrichment/types';
const { ingestModeOptions } = (validationSchema as any) || {};

const PushConfigForm: React.FC<PropsPush> = ({ control, errors }) => (
  <div className="space-y-6">
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
        <Box sx={{ color: 'gray', fontFamily: 'monospace', fontSize: '14px' }}>
          {/* preview logic */}
        </Box>
        <Box sx={{ fontSize: '12px', color: '#666', mt: 1 }}>
          Example: /{'tenantId'}/enrichment/v1.0.0/customer/data
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
        {errors?.ingestMode && (
          <ValidationError message={errors?.ingestMode?.message} />
        )}
      </Grid>
    </Grid>
  </div>
);

export default PushConfigForm;
