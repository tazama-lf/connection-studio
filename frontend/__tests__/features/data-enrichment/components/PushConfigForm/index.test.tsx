import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@mui/material/Grid', () => (props: any) => (
  <div data-testid="mui-grid">{props.children}</div>
));
jest.mock('@mui/material/Alert', () => (props: any) => (
  <div data-testid="mui-alert">{props.children}</div>
));
jest.mock('@mui/material/Box', () => (props: any) => (
  <div data-testid="mui-box">{props.children}</div>
));

jest.mock('../../../../../src/shared/components/FormFields', () => {
  const makeField = (label: string) => (props: any) => (
    <div
      data-testid={`${label}-${props.name}`}
      data-options-len={
        Array.isArray(props.options) ? props.options.length : -1
      }
    >
      {label}:{props.name}
    </div>
  );

  return {
    EndpointNameInputField: makeField('EndpointNameInputField'),
    VersionInputField: makeField('VersionInputField'),
    ApiPathInputField: makeField('ApiPathInputField'),
    MultiLineTextInputField: makeField('MultiLineTextInputField'),
    DatabaseTableInputField: makeField('DatabaseTableInputField'),
    SelectField: makeField('SelectField'),
  };
});

jest.mock(
  '../../../../../src/shared/components/ValidationError',
  () => (props: any) => (
    <div data-testid={`validation-${props.message}`}>{props.message}</div>
  ),
);

jest.mock(
  '../../../../../src/features/data-enrichment/components/validationSchema',
  () => ({
    ingestModeOptions: [{ label: 'Append', value: 'append' }],
  }),
);

import PushConfigForm from '../../../../../src/features/data-enrichment/components/PushConfigForm';

describe('features/data-enrichment/components/PushConfigForm/index.tsx', () => {
  it('renders fields, preview block, and validation errors', () => {
    render(
      <PushConfigForm
        control={{} as any}
        errors={
          {
            name: { message: 'name-error' },
            version: { message: 'version-error' },
            endpointPath: { message: 'endpoint-error' },
            description: { message: 'description-error' },
            targetTable: { message: 'table-error' },
            ingestMode: { message: 'ingest-error' },
          } as any
        }
      />,
    );

    expect(
      screen.getByTestId('EndpointNameInputField-name'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('VersionInputField-version')).toBeInTheDocument();
    expect(
      screen.getByTestId('ApiPathInputField-endpointPath'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('DatabaseTableInputField-targetTable'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('SelectField-ingestMode')).toHaveAttribute(
      'data-options-len',
      '1',
    );
    expect(screen.getByText('Endpoint Path Preview')).toBeInTheDocument();
    expect(
      screen.getByText('Example: /tenantId/enrichment/v1.0.0/customer/data'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('validation-name-error')).toBeInTheDocument();
    expect(screen.getByTestId('validation-ingest-error')).toBeInTheDocument();
  });

  it('falls back to empty ingest options when schema options are missing', () => {
    jest.resetModules();
    jest.doMock(
      '../../../../../src/features/data-enrichment/components/validationSchema',
      () => ({}),
    );

    let PushConfigFormDynamic: any;
    jest.isolateModules(() => {
      PushConfigFormDynamic =
        require('../../../../../src/features/data-enrichment/components/PushConfigForm').default;
    });

    render(<PushConfigFormDynamic control={{} as any} errors={{} as any} />);

    expect(screen.getByTestId('SelectField-ingestMode')).toHaveAttribute(
      'data-options-len',
      '0',
    );
    expect(
      screen.queryByTestId('validation-name-error'),
    ).not.toBeInTheDocument();
  });
});
