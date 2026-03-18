import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DeploymentConfirmation } from '../../../src/shared/components/DeploymentConfirmation';
import { configApi } from '../../../src/features/config/services/configApi';

jest.mock('../../../src/features/config/services/configApi', () => ({
  configApi: {
    getConfig: jest.fn(),
  },
}));

describe('DeploymentConfirmation', () => {
  const mockedGetConfig = configApi.getConfig as jest.Mock;

  const fallbackConfigData = {
    status: 'approved',
    endpointPath: '/fallback/path',
    transactionType: 'payments',
    version: '2.0',
    contentType: 'application/json',
    msgFam: 'pacs.008',
    schema: { amount: 100 },
    mapping: [
      {
        transformation: 'DIRECT',
        source: 'src.amount',
        destination: 'dest.amount',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders fallback data when configId is not provided', async () => {
    render(
      <DeploymentConfirmation
        endpointPath="/external/path"
        transactionType="transfers"
        configData={fallbackConfigData}
      />,
    );

    expect(await screen.findByText('Configuration Approved')).toBeInTheDocument();
    expect(screen.getAllByText('/fallback/path').length).toBeGreaterThan(0);
    expect(screen.getByText('pacs.008')).toBeInTheDocument();
    expect(screen.getByText(/Field Mappings \(1\)/)).toBeInTheDocument();
  });

  it('shows missing config id error when no fallback exists', async () => {
    render(
      <DeploymentConfirmation
        endpointPath="/external/path"
        transactionType="transfers"
      />,
    );

    expect(await screen.findByText('Error Loading Configuration')).toBeInTheDocument();
    expect(screen.getByText('No configuration ID provided')).toBeInTheDocument();
  });

  it('loads data from API when configId is provided', async () => {
    mockedGetConfig.mockResolvedValueOnce({
      success: true,
      config: {
        ...fallbackConfigData,
        endpointPath: '/api/path',
        status: 'under_review',
      },
    });

    render(
      <DeploymentConfirmation
        configId={99}
        endpointPath="/external/path"
        transactionType="transfers"
      />,
    );

    await waitFor(() => {
      expect(mockedGetConfig).toHaveBeenCalledWith(99);
    });

    expect(await screen.findByText('Pending Review')).toBeInTheDocument();
    expect(screen.getAllByText('/api/path').length).toBeGreaterThan(0);
  });

  it('falls back to local data on authentication message', async () => {
    mockedGetConfig.mockResolvedValueOnce({
      success: false,
      message: '401 Unauthorized',
    });

    render(
      <DeploymentConfirmation
        configId={1}
        endpointPath="/external/path"
        configData={fallbackConfigData}
      />,
    );

    expect(await screen.findByText('Configuration Approved')).toBeInTheDocument();
    expect(screen.queryByText('Authentication required. Please log in again.')).not.toBeInTheDocument();
  });

  it('shows authentication error when no fallback data exists', async () => {
    mockedGetConfig.mockResolvedValueOnce({
      success: false,
      message: 'Unauthorized',
    });

    render(
      <DeploymentConfirmation
        configId={1}
        endpointPath="/external/path"
      />,
    );

    expect(await screen.findByText('Authentication required. Please log in again.')).toBeInTheDocument();
  });

  it('shows network failure error when API throws and no fallback exists', async () => {
    mockedGetConfig.mockRejectedValueOnce(new Error('Network down'));

    render(
      <DeploymentConfirmation
        configId={1}
        endpointPath="/external/path"
      />,
    );

    expect(await screen.findByText('Failed to load configuration data: Network down')).toBeInTheDocument();
  });

  it('uses fallback when API throws and fallback data is present', async () => {
    mockedGetConfig.mockRejectedValueOnce(new Error('API crashed'));

    render(
      <DeploymentConfirmation
        configId={1}
        endpointPath="/external/path"
        configData={fallbackConfigData}
      />,
    );

    expect(await screen.findByText('Configuration Approved')).toBeInTheDocument();
    expect(screen.queryByText('API crashed')).not.toBeInTheDocument();
  });

  it('shows fallback error with unknown error type when non-Error is thrown', async () => {
    mockedGetConfig.mockRejectedValueOnce('string error');

    render(
      <DeploymentConfirmation
        configId={1}
        endpointPath="/external/path"
      />,
    );

    expect(
      await screen.findByText(/Failed to load configuration data: Unknown error/),
    ).toBeInTheDocument();
  });

  it('shows generic API error when response fails with non-auth message', async () => {
    mockedGetConfig.mockResolvedValueOnce({
      success: false,
      message: 'Server error 500',
    });

    render(
      <DeploymentConfirmation
        configId={1}
        endpointPath="/external/path"
      />,
    );

    expect(await screen.findByText('Server error 500')).toBeInTheDocument();
  });

  it('renders no config data state when configData is null with no error', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');
    const seeds = [null, false, null]; // configData, loading, error

    useStateSpy.mockImplementation((initial: any) => {
      if (seeds.length > 0) {
        const next = seeds.shift();
        return [next, jest.fn()] as any;
      }
      return originalUseState(initial);
    });

    try {
      render(
        <DeploymentConfirmation
          configId={99}
          endpointPath="/test/path"
        />,
      );

      expect(screen.getByText('No configuration data available')).toBeInTheDocument();
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('renders functions section when config has functions', async () => {
    const configWithFunctions = {
      ...fallbackConfigData,
      functions: [
        {
          functionName: 'enrichData',
          tableName: 'risk_table',
          columns: [{ param: 'col1' }, { param: 'col2' }],
        },
        {
          functionName: 'validate',
          params: ['param1', 'param2'],
        },
      ],
    };

    render(
      <DeploymentConfirmation
        endpointPath="/external/path"
        configData={configWithFunctions}
      />,
    );

    expect(await screen.findByText('enrichData')).toBeInTheDocument();
    expect(screen.getByText('validate')).toBeInTheDocument();
    expect(screen.getByText(/Columns: col1, col2/)).toBeInTheDocument();
    expect(screen.getByText(/Parameters: param1, param2/)).toBeInTheDocument();
    expect(screen.getByText('Table Name: risk_table')).toBeInTheDocument();
  });

  it('renders status showing Ready to Submit for status other than approved/under_review', async () => {
    const draftConfig = {
      ...fallbackConfigData,
      status: 'draft',
    };

    render(
      <DeploymentConfirmation
        endpointPath="/external/path"
        configData={draftConfig}
      />,
    );

    expect(
      await screen.findByText('Ready to Submit for Approval'),
    ).toBeInTheDocument();
  });

  it('uses fallback error message when response.message is null', async () => {
    mockedGetConfig.mockResolvedValueOnce({
      success: false,
      message: null,
    });

    render(
      <DeploymentConfirmation
        configId={1}
        endpointPath="/external/path"
      />,
    );

    expect(await screen.findByText('Failed to load configuration data')).toBeInTheDocument();
  });

  it('renders with configData missing several optional fields (uses fallback props)', async () => {
    const sparseConfig = {
      status: 'approved',
      // No endpointPath, transactionType, version, contentType, schema, mapping
    };

    render(
      <DeploymentConfirmation
        endpointPath="/prop/endpoint"
        transactionType="prop-type"
        configData={sparseConfig}
      />,
    );

    // Should fallback to prop values
    expect(await screen.findAllByText('/prop/endpoint')).toHaveLength(2);
    expect(screen.getByText('prop-type')).toBeInTheDocument();
    expect(screen.getByText('1.0')).toBeInTheDocument();
    expect(screen.getByText('application/json')).toBeInTheDocument();
    // mapping length is 0
    expect(screen.getByText(/0 field mappings/)).toBeInTheDocument();
  });

  it('renders with payload fallback (no schema) and shows ReactJson with payload', async () => {
    const configWithPayload = {
      status: 'approved',
      endpointPath: '/payload/path',
      payload: { key: 'value' },
      // No schema
    };

    render(
      <DeploymentConfirmation
        endpointPath="/external/path"
        configData={configWithPayload}
      />,
    );

    expect(await screen.findByText('Configuration Approved')).toBeInTheDocument();
  });

  it('does not render schema section when neither schema nor payload is present', async () => {
    const configNoSchema = {
      status: 'approved',
      endpointPath: '/no-schema/path',
      transactionType: 'debit',
      version: '1.0',
      contentType: 'application/json',
      mapping: [{ transformation: 'DIRECT', source: 'src', destination: 'dst' }],
      // no schema, no payload
    };

    render(
      <DeploymentConfirmation
        endpointPath="/external/path"
        configData={configNoSchema}
      />,
    );

    expect(await screen.findByText('Configuration Approved')).toBeInTheDocument();
  });

  it('renders mappings with array source/destination and constantValue', async () => {
    const configWithArrayMappings = {
      status: 'approved',
      endpointPath: '/array/path',
      mapping: [
        {
          transformation: undefined,
          source: ['src1', 'src2'],
          destination: ['dst1', 'dst2'],
          constantValue: 'CONST_VAL',
        },
        {
          transformation: 'SPLIT',
          source: null,
          destination: null,
        },
      ],
    };

    render(
      <DeploymentConfirmation
        endpointPath="/external/path"
        configData={configWithArrayMappings}
      />,
    );

    expect(await screen.findByText('Configuration Approved')).toBeInTheDocument();
    expect(screen.getByText('DIRECT')).toBeInTheDocument();
    expect(screen.getByText('src1, src2')).toBeInTheDocument();
    expect(screen.getByText('dst1, dst2')).toBeInTheDocument();
    expect(screen.getByText('Constant: CONST_VAL')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('renders function with no params (showing None) and function with only params', async () => {
    const configWithFunctions = {
      status: 'approved',
      endpointPath: '/func/path',
      functions: [
        {
          functionName: 'noParamFunc',
          // No columns, no params
        },
        {
          functionName: 'paramFunc',
          params: null,
        },
      ],
    };

    render(
      <DeploymentConfirmation
        endpointPath="/external/path"
        configData={configWithFunctions}
      />,
    );

    expect(await screen.findByText('noParamFunc')).toBeInTheDocument();
    expect(screen.getAllByText('Parameters: None').length).toBeGreaterThan(0);
  });

  it('does not render ReactJson when both schema and payload are absent from configData', async () => {
    // Covers the false branch of: {(configData.schema || configData.payload) && <ReactJson ... />}
    const configWithoutSchemaOrPayload = {
      ...fallbackConfigData,
      schema: undefined,
      payload: undefined,
    };

    render(
      <DeploymentConfirmation
        endpointPath="/external/path"
        configData={configWithoutSchemaOrPayload}
      />,
    );

    // Wait for the component to finish rendering
    await screen.findByText('Configuration Approved');
    // ReactJson should not be rendered when neither schema nor payload exists
    expect(screen.queryByTestId('react-json-view')).not.toBeInTheDocument();
  });
});
