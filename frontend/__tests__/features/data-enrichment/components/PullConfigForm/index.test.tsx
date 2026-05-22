import React from 'react';
import { render, screen } from '@testing-library/react';

const getAssociatedScheduleOptionsMock = jest.fn();

jest.mock('@mui/material/Grid', () => (props: any) => (
  <div data-testid="mui-grid">{props.children}</div>
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
    SelectField: makeField('SelectField'),
    MultiLineTextInputField: makeField('MultiLineTextInputField'),
    HostInputField: makeField('HostInputField'),
    NumberInputField: makeField('NumberInputField'),
    TextInputField: makeField('TextInputField'),
    PasswordInputField: makeField('PasswordInputField'),
    URLInputField: makeField('URLInputField'),
    FilePathInputField: makeField('FilePathInputField'),
    DelimiterInputField: makeField('DelimiterInputField'),
    DatabaseTableInputField: makeField('DatabaseTableInputField'),
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
    authenticationTypeOptions: [{ label: 'Key', value: 'key' }],
    fileFormatOptions: [{ label: 'CSV', value: 'csv' }],
    ingestModeOptions: [{ label: 'Append', value: 'append' }],
    getAssociatedScheduleOptions: (...args: any[]) =>
      getAssociatedScheduleOptionsMock(...args),
  }),
);

import PullConfigForm from '../../../../../src/features/data-enrichment/components/PullConfigForm';

const buildWatch = (values: Record<string, any>) => (field: string) =>
  values[field];

describe('features/data-enrichment/components/PullConfigForm/index.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAssociatedScheduleOptionsMock.mockReturnValue([
      { label: 'Sched A', value: 'A' },
    ]);
  });

  it('renders SFTP key + csv branches and validation errors', () => {
    render(
      <PullConfigForm
        control={{} as any}
        watch={
          buildWatch({
            sourceType: 'sftp',
            authType: 'key',
            fileFormat: 'csv',
          }) as any
        }
        availableSchedules={[{ id: 1 }] as any}
        errors={
          {
            name: { message: 'name-error' },
            version: { message: 'version-error' },
            sourceType: { message: 'source-error' },
            description: { message: 'description-error' },
            schedule: { message: 'schedule-error' },
            host: { message: 'host-error' },
            port: { message: 'port-error' },
            authType: { message: 'auth-error' },
            username: { message: 'username-error' },
            password: { message: 'password-error' },
            pathPattern: { message: 'path-error' },
            fileFormat: { message: 'format-error' },
            delimiter: { message: 'delimiter-error' },
            targetTable: { message: 'target-error' },
            ingestMode: { message: 'ingest-error' },
          } as any
        }
      />,
    );

    expect(screen.getByTestId('HostInputField-host')).toBeInTheDocument();
    expect(
      screen.getByTestId('MultiLineTextInputField-password'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('PasswordInputField-password'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('DelimiterInputField-delimiter'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('FilePathInputField-pathPattern'),
    ).toBeInTheDocument();
    expect(screen.getByText('File Settings')).toBeInTheDocument();
    expect(screen.getByTestId('validation-name-error')).toBeInTheDocument();
    expect(screen.getByTestId('validation-ingest-error')).toBeInTheDocument();
  });

  it('renders SFTP password + non-csv branches without delimiter', () => {
    render(
      <PullConfigForm
        control={{} as any}
        watch={
          buildWatch({
            sourceType: 'sftp',
            authType: 'password',
            fileFormat: 'json',
          }) as any
        }
        availableSchedules={[] as any}
        errors={{} as any}
      />,
    );

    expect(
      screen.getByTestId('PasswordInputField-password'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('MultiLineTextInputField-password'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('DelimiterInputField-delimiter'),
    ).not.toBeInTheDocument();
  });

  it('renders HTTP branch and falls back to empty schedule options', () => {
    getAssociatedScheduleOptionsMock.mockReturnValue(undefined);

    render(
      <PullConfigForm
        control={{} as any}
        watch={
          buildWatch({
            sourceType: 'http',
            authType: 'password',
            fileFormat: 'csv',
          }) as any
        }
        availableSchedules={[{ id: 77 }] as any}
        errors={
          {
            url: { message: 'url-error' },
            headers: { message: 'headers-error' },
          } as any
        }
      />,
    );

    expect(screen.getByTestId('URLInputField-url')).toBeInTheDocument();
    expect(
      screen.getByTestId('MultiLineTextInputField-headers'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('HostInputField-host')).not.toBeInTheDocument();
    expect(screen.queryByText('File Settings')).not.toBeInTheDocument();
    expect(screen.getByTestId('validation-url-error')).toBeInTheDocument();
    expect(screen.getByTestId('validation-headers-error')).toBeInTheDocument();
    expect(screen.getByTestId('SelectField-schedule')).toHaveAttribute(
      'data-options-len',
      '0',
    );
    expect(getAssociatedScheduleOptionsMock).toHaveBeenCalledWith([{ id: 77 }]);
  });

  it('covers fallback empty arrays when schema option constants are missing', () => {
    jest.resetModules();

    jest.doMock(
      '../../../../../src/features/data-enrichment/components/validationSchema',
      () => ({
        getAssociatedScheduleOptions: () => [{ label: 'Sched', value: 'S' }],
      }),
    );

    let PullConfigFormDynamic: any;
    jest.isolateModules(() => {
      PullConfigFormDynamic =
        require('../../../../../src/features/data-enrichment/components/PullConfigForm').default;
    });

    render(
      <PullConfigFormDynamic
        control={{} as any}
        watch={
          buildWatch({
            sourceType: 'sftp',
            authType: 'password',
            fileFormat: 'json',
          }) as any
        }
        availableSchedules={[] as any}
        errors={{} as any}
      />,
    );

    expect(screen.getByTestId('SelectField-authType')).toHaveAttribute(
      'data-options-len',
      '0',
    );
    expect(screen.getByTestId('SelectField-fileFormat')).toHaveAttribute(
      'data-options-len',
      '0',
    );
    expect(screen.getByTestId('SelectField-ingestMode')).toHaveAttribute(
      'data-options-len',
      '0',
    );
  });

  it('covers schema object fallback branch when validation module is undefined', () => {
    jest.resetModules();

    jest.doMock(
      '../../../../../src/features/data-enrichment/components/validationSchema',
      () => undefined,
    );

    let PullConfigFormDynamic: any;
    jest.isolateModules(() => {
      PullConfigFormDynamic =
        require('../../../../../src/features/data-enrichment/components/PullConfigForm').default;
    });

    expect(() =>
      render(
        <PullConfigFormDynamic
          control={{} as any}
          watch={
            buildWatch({
              sourceType: 'http',
              authType: 'password',
              fileFormat: 'csv',
            }) as any
          }
          availableSchedules={[] as any}
          errors={{} as any}
        />,
      ),
    ).toThrow();
  });
});
