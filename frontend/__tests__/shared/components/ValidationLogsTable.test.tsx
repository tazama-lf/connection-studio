import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('lucide-react', () => ({
  DownloadIcon: () => <span data-testid="download-icon" />,
  ChevronDownIcon: (props: any) => (
    <span data-testid="chevron-icon" {...props} />
  ),
  ClockIcon: () => <span data-testid="clock-icon" />,
}));

jest.mock('../../../src/shared/components/Button', () => ({
  Button: (props: any) => (
    <button onClick={props.onClick}>{props.children}</button>
  ),
}));

import ValidationLogsTable from '../../../src/shared/components/ValidationLogsTable';

describe('shared/components/ValidationLogsTable.tsx', () => {
  it('renders default logs and supports filtering and row expansion', () => {
    render(<ValidationLogsTable />);

    expect(screen.getByText('Validation Logs')).toBeInTheDocument();
    expect(screen.getByText('/transactions/pacs.008')).toBeInTheDocument();
    expect(screen.getByText('/accounts/acmt.023')).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText('Search endpoints or errors...'),
      {
        target: { value: 'currency' },
      },
    );
    expect(screen.getByText('/transactions/pacs.008')).toBeInTheDocument();

    fireEvent.click(screen.getByText('3 errors'));
    expect(screen.getByText('Error Stack')).toBeInTheDocument();
    expect(screen.getByText('Failed Payload')).toBeInTheDocument();

    fireEvent.click(screen.getByText('3 errors'));
    expect(screen.queryByText('Error Stack')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('24H'));
    fireEvent.click(screen.getByText('7D'));
    fireEvent.click(screen.getByText('30D'));
    fireEvent.click(screen.getByText('ALL'));
  });

  it('renders custom logs and covers SUCCESS/default status branches', () => {
    const logs = [
      {
        id: 10,
        timestamp: 'now',
        endpoint: '/ok',
        status: 'SUCCESS',
        errorCount: 0,
        payload: null,
      },
      {
        id: 11,
        timestamp: 'later',
        endpoint: '/unknown',
        status: 'OTHER',
      },
      {
        id: 12,
        timestamp: 'later2',
        endpoint: '/single',
        status: 'ERROR',
        errorCount: 1,
        errors: [{ message: 'single issue', type: 'error' }],
      },
    ] as any;

    render(<ValidationLogsTable logs={logs} />);

    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('OTHER')).toBeInTheDocument();

    fireEvent.click(screen.getByText('1 error'));
    expect(screen.getByText('single issue')).toBeInTheDocument();
  });
});
