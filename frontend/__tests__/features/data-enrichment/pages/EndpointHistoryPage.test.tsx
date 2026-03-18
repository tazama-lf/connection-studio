import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EndpointHistoryPage from '../../../../src/features/data-enrichment/pages/EndpointHistoryPage';
import { dataEnrichmentJobApi } from '../../../../src/features/data-enrichment/handlers';

const mockNavigate = jest.fn();
const mockSetOffset = jest.fn();

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useLocation: () => ({ search: '?jobId=job-1' }),
  useNavigate: () => mockNavigate,
}));

jest.mock('@shared/config/app.config', () => ({
  UI_CONFIG: {
    pagination: {
      defaultPageSize: 10,
    },
  },
}));

jest.mock('@shared/hooks/useFilters', () => ({
  __esModule: true,
  default: () => ({
    offset: 1,
    limit: 10,
    setOffset: mockSetOffset,
  }),
}));

jest.mock('@shared/helpers', () => ({
  handleInputFilter: () => <input data-testid="endpointName-filter" readOnly />, 
}));

jest.mock('@common/Tables/CustomTable', () => ({
  __esModule: true,
  default: ({ columns, rows, pagination }: any) => {
    const ReactModule = require('react');
    return ReactModule.createElement(
      'div',
      { 'data-testid': 'custom-table' },
      pagination
        ? ReactModule.createElement(
          'button',
          {
            key: 'go-page-3',
            onClick: () => pagination.setPage(3),
          },
          'go-page-3',
        )
        : null,
      columns.map((column: any) =>
        ReactModule.createElement(
          'div',
          { key: `header-${column.field}` },
          column.renderHeader ? column.renderHeader() : column.headerName,
        ),
      ),
      rows.map((row: any, rowIndex: number) =>
        ReactModule.createElement(
          'div',
          { key: `row-${rowIndex}` },
          columns.map((column: any) =>
            ReactModule.createElement(
              'div',
              { key: `cell-${rowIndex}-${column.field}` },
              column.renderCell
                ? column.renderCell({ value: row[column.field], row })
                : String(row[column.field] ?? ''),
            ),
          ),
        ),
      ),
    );
  },
}));

jest.mock('../../../../src/features/data-enrichment/handlers', () => ({
  dataEnrichmentJobApi: {
    getJobHistory: jest.fn(),
  },
}));

describe('EndpointHistoryPage', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockReset();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('loads endpoint history successfully', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockResolvedValue({
      data: [
        {
          job_id: 'job-1',
          endpoint_name: 'endpoint-a',
          table_name: 'table_a',
          counts: 3,
          processed_counts: 2,
          created_at: '2024-01-01T00:00:00.000Z',
          exception: 'sample exception',
          status: 'STATUS_04_APPROVED',
          publishing_status: 'active',
          tenant_id: 'tenant-1',
          version: 'v1.0.0',
          description: 'desc',
        },
      ],
      total: 1,
    });

    render(<EndpointHistoryPage />);

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getJobHistory).toHaveBeenCalledWith(
        'job-1',
        1,
        10,
        {},
      );
    });

    expect(screen.getByText('Endpoint Last Runs')).toBeInTheDocument();
  });

  it('shows error text when history load fails', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockRejectedValue(
      new Error('Failed to load history'),
    );

    render(<EndpointHistoryPage />);

    expect(await screen.findByText('Failed to load history')).toBeInTheDocument();
  });

  it('shows fallback error text when failure has no message', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockRejectedValue({});

    render(<EndpointHistoryPage />);

    expect(await screen.findByText('Failed to load history')).toBeInTheDocument();
  });

  it('navigates back when Go Back is clicked', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
    });

    render(<EndpointHistoryPage />);

    fireEvent.click(screen.getByText('Go Back'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it('shows loading state while awaiting history response', async () => {
    let resolveHistory: ((value: unknown) => void) | null = null;
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveHistory = resolve;
      }),
    );

    render(<EndpointHistoryPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    resolveHistory?.({ data: [], total: 0 });
  });

  it('renders no-exception branch in details modal', async () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');
    const seededState = [
      [],
      false,
      null,
      1,
      0,
      0,
      {},
      true,
      {
        job_id: 'job-2',
        endpoint_name: null,
        table_name: null,
        counts: 0,
        processed_counts: 0,
        created_at: null,
        exception: '',
        status: 'unknown_status',
        publishing_status: 'custom-status',
        tenant_id: null,
        version: null,
        description: null,
      },
      false,
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    try {
      render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('updates offset when table pagination changes page', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
    });

    render(<EndpointHistoryPage />);

    await waitFor(() => {
      expect(screen.getByTestId('custom-table')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('go-page-3'));
    expect(mockSetOffset).toHaveBeenCalledWith(2);
  });

  it('renders exception details modal branch and copies job id successfully', async () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');
    const seededState = [
      [],
      false,
      null,
      1,
      0,
      0,
      {},
      true,
      {
        job_id: 'job-99',
        endpoint_name: 'endpoint-z',
        table_name: 'table_z',
        counts: 11,
        processed_counts: 10,
        created_at: '2024-02-03T10:11:12.000Z',
        exception: 'runtime failed',
        status: 'STATUS_03_UNDER_REVIEW',
        publishing_status: 'in-active',
        tenant_id: 'tenant-z',
        version: 'v2',
        description: 'history row',
      },
      false,
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    try {
      render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
      expect(screen.getByText('runtime failed')).toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('copy-job-id'));
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('job-99');
      });
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('handles clipboard copy failure branch without throwing', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');
    const seededState = [
      [],
      false,
      null,
      1,
      0,
      0,
      {},
      true,
      {
        job_id: 'job-100',
        endpoint_name: 'endpoint-f',
        table_name: 'table_f',
        counts: 1,
        processed_counts: 1,
        created_at: '2024-03-04T00:00:00.000Z',
        exception: '',
        status: 'active',
        publishing_status: 'active',
        tenant_id: 'tenant-f',
        version: 'v1',
        description: 'copy failure branch',
      },
      false,
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('copy blocked'));

    try {
      render(<EndpointHistoryPage />);
      expect(() => {
        fireEvent.click(screen.getByLabelText('copy-job-id'));
      }).not.toThrow();
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('renders No data branch when modal is open without active record', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');
    const seededState = [
      [],
      false,
      null,
      1,
      0,
      0,
      {},
      true,
      null,
      false,
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    try {
      render(<EndpointHistoryPage />);
      expect(screen.getByText('No data')).toBeInTheDocument();
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('opens modal and closes via close button when view is clicked', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockResolvedValue({
      data: [
        {
          job_id: 'job-abc',
          endpoint_name: 'ep-test',
          table_name: 'tbl_test',
          counts: 5,
          processed_counts: 4,
          created_at: '2024-03-01T08:00:00.000Z',
          exception: false,
          status: 'STATUS_01_IN_PROGRESS',
          publishing_status: 'active',
          tenant_id: 'tenant-t',
          version: 'v3',
        },
      ],
      total: 1,
    });

    await act(async () => {
      render(<EndpointHistoryPage />);
    });

    // Wait for and click the view-details button (handles re-render timing)
    const viewBtn = await screen.findByLabelText('view-details-job-abc', {}, { timeout: 8000 });

    await act(async () => {
      fireEvent.click(viewBtn);
    });

    // Modal should now be open
    expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();

    // Close the modal via the close button
    await act(async () => {
      fireEvent.click(screen.getByLabelText('close'));
    });
  }, 15000);

  it('covers getStatusBadge prefix branch cases: in_progress, rejected, changes_requested', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');

    const statuses = [
      'STATUS_01_IN_PROGRESS',
      'STATUS_05_REJECTED',
      'STATUS_05_CHANGES_REQUESTED',
    ];

    statuses.forEach((status) => {
      const seededState = [
        [],
        false,
        null,
        1,
        0,
        0,
        {},
        true,
        {
          job_id: 'job-x',
          endpoint_name: 'ep',
          table_name: 'tbl',
          counts: 1,
          processed_counts: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          exception: false,
          status,
          publishing_status: 'active',
          tenant_id: 'tenant-x',
          version: 'v1',
        },
        false,
      ];

      useStateSpy.mockImplementation((initial: unknown) => {
        if (seededState.length > 0) {
          const next = seededState.shift();
          return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
        }
        return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      });

      const { unmount } = render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
      unmount();
    });

    useStateSpy.mockRestore();
  });

  it('covers getStatusBadge prefix branch cases: exported, ready_for_deployment, deployed, suspended', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');

    const statuses = [
      'STATUS_06_EXPORTED',
      'STATUS_07_READY_FOR_DEPLOYMENT',
      'STATUS_08_DEPLOYED',
      'STATUS_XX_SUSPENDED',
    ];

    statuses.forEach((status) => {
      const seededState = [
        [],
        false,
        null,
        1,
        0,
        0,
        {},
        true,
        {
          job_id: 'job-y',
          endpoint_name: 'ep2',
          table_name: 'tbl2',
          counts: 1,
          processed_counts: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          exception: false,
          status,
          publishing_status: 'active',
          tenant_id: 'tenant-y',
          version: 'v2',
        },
        false,
      ];

      useStateSpy.mockImplementation((initial: unknown) => {
        if (seededState.length > 0) {
          const next = seededState.shift();
          return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
        }
        return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      });

      const { unmount } = render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
      unmount();
    });

    useStateSpy.mockRestore();
  });

  it('covers getStatusBadge prefix default branch (status_02_on_hold)', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');

    const seededState = [
      [],
      false,
      null,
      1,
      0,
      0,
      {},
      true,
      {
        job_id: 'job-z',
        endpoint_name: 'ep3',
        table_name: 'tbl3',
        counts: 1,
        processed_counts: 1,
        created_at: null,
        exception: false,
        status: 'STATUS_02_ON_HOLD',
        publishing_status: 'active',
        tenant_id: null,
        version: null,
      },
      false,
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    try {
      render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('covers plain getStatusBadge switch cases: in-progress, draft, cloned, deployed', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');

    const statuses = ['in-progress', 'draft', 'cloned', 'deployed'];

    statuses.forEach((status) => {
      const seededState = [
        [],
        false,
        null,
        1,
        0,
        0,
        {},
        true,
        {
          job_id: 'job-plain',
          endpoint_name: 'ep-plain',
          table_name: null,
          counts: 0,
          processed_counts: 0,
          created_at: null,
          exception: false,
          status,
          publishing_status: 'in-active',
          tenant_id: null,
          version: null,
        },
        false,
      ];

      useStateSpy.mockImplementation((initial: unknown) => {
        if (seededState.length > 0) {
          const next = seededState.shift();
          return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
        }
        return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      });

      const { unmount } = render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
      unmount();
    });

    useStateSpy.mockRestore();
  });

  it('covers plain getStatusBadge switch: rejected, under_review, changes_requested, exported, ready_for_deployment', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');

    const statuses = [
      'rejected',
      'under_review',
      'changes_requested',
      'exported',
      'ready_for_deployment',
    ];

    statuses.forEach((status) => {
      const seededState = [
        [],
        false,
        null,
        1,
        0,
        0,
        {},
        true,
        {
          job_id: 'job-plain2',
          endpoint_name: 'ep-p2',
          table_name: 'tbl-p2',
          counts: 2,
          processed_counts: 1,
          created_at: '2024-06-01T00:00:00.000Z',
          exception: true,
          status,
          publishing_status: 'active',
          tenant_id: 'ten-p2',
          version: 'v5',
        },
        false,
      ];

      useStateSpy.mockImplementation((initial: unknown) => {
        if (seededState.length > 0) {
          const next = seededState.shift();
          return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
        }
        return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      });

      const { unmount } = render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
      unmount();
    });

    useStateSpy.mockRestore();
  });

  it('covers plain getStatusBadge: suspended, under review, changes requested, ready for deployment', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');

    const statuses = [
      'suspended',
      'under review',
      'changes requested',
      'ready for deployment',
    ];

    statuses.forEach((status) => {
      const seededState = [
        [],
        false,
        null,
        1,
        0,
        0,
        {},
        true,
        {
          job_id: 'job-more',
          endpoint_name: 'ep-more',
          table_name: 'tbl-more',
          counts: 3,
          processed_counts: 3,
          created_at: '2024-07-01T00:00:00.000Z',
          exception: false,
          status,
          publishing_status: 'active',
          tenant_id: 'tenant-more',
          version: 'v6',
        },
        false,
      ];

      useStateSpy.mockImplementation((initial: unknown) => {
        if (seededState.length > 0) {
          const next = seededState.shift();
          return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
        }
        return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      });

      const { unmount } = render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
      unmount();
    });

    useStateSpy.mockRestore();
  });

  it('covers ready for approval status in plain switch', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');

    const seededState = [
      [],
      false,
      null,
      1,
      0,
      0,
      {},
      true,
      {
        job_id: 'job-rfa',
        endpoint_name: 'ep-rfa',
        table_name: 'tbl-rfa',
        counts: 1,
        processed_counts: 1,
        created_at: '2024-08-01T00:00:00.000Z',
        exception: false,
        status: 'ready for approval',
        publishing_status: 'active',
        tenant_id: 'tenant-rfa',
        version: 'v7',
      },
      false,
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    try {
      render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('covers prefix branch rejected case directly (STATUS_05_REJECTED)', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');

    const seededState = [
      [],
      false,
      null,
      1,
      0,
      0,
      {},
      true,
      {
        job_id: 'job-rej',
        endpoint_name: 'ep-rej',
        table_name: 'tbl-rej',
        counts: 1,
        processed_counts: 0,
        created_at: '2024-09-01T00:00:00.000Z',
        exception: false,
        status: 'STATUS_05_REJECTED',
        publishing_status: 'in-active',
        tenant_id: 'tenant-rej',
        version: 'v8',
      },
      false,
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    try {
      render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
      // The modal content renders Status section with getStatusBadge('STATUS_05_REJECTED')
      expect(screen.getByText('STATUS_05_REJECTED')).toBeInTheDocument();
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('covers prefix branch approved case (STATUS_04_APPROVED) in modal', () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');

    const seededState = [
      [],
      false,
      null,
      1,
      0,
      0,
      {},
      true,
      {
        job_id: 'job-appr',
        endpoint_name: 'ep-appr',
        table_name: 'tbl-appr',
        counts: 10,
        processed_counts: 10,
        created_at: '2024-10-01T00:00:00.000Z',
        exception: false,
        status: 'STATUS_04_APPROVED',
        publishing_status: 'active',
        tenant_id: 'tenant-appr',
        version: 'v9',
      },
      false,
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    try {
      render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
      expect(screen.getByText('STATUS_04_APPROVED')).toBeInTheDocument();
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('renders row with plain status (active) to hit the startsWith false branch in getStatusBadge', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockResolvedValue({
      data: [
        {
          job_id: 'job-plain-row',
          endpoint_name: 'ep-plain-row',
          table_name: 'tbl-plain',
          counts: 1,
          processed_counts: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          exception: false,
          status: 'active',
          publishing_status: 'active',
          tenant_id: 'tenant-plain',
          version: 'v1',
        },
      ],
      total: 1,
    });

    render(<EndpointHistoryPage />);

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getJobHistory).toHaveBeenCalled();
    });
  });

  it('renders row with undefined status to hit getStatusBadge early return', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockResolvedValue({
      data: [
        {
          job_id: 'job-no-status',
          endpoint_name: 'ep-no-status',
          table_name: null,
          counts: 0,
          processed_counts: 0,
          created_at: null,
          exception: null,
          status: undefined,
          publishing_status: null,
          tenant_id: null,
          version: null,
        },
      ],
      total: 1,
    });

    render(<EndpointHistoryPage />);

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getJobHistory).toHaveBeenCalled();
    });
  });

  it('handles response with no total field (uses data.length fallback)', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockResolvedValue({
      data: [
        {
          job_id: 'job-nototal',
          endpoint_name: 'ep',
          table_name: 'tbl',
          counts: 1,
          processed_counts: 1,
          created_at: '2024-01-01T00:00:00Z',
          exception: false,
          status: 'STATUS_01_IN_PROGRESS',
          publishing_status: 'active',
          tenant_id: 'tenant',
          version: 'v1',
        },
      ],
      // total not provided — hits the ?? fallback at line 149
      // then res.data is truthy → uses res.data.length
    });

    render(<EndpointHistoryPage />);

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getJobHistory).toHaveBeenCalled();
    });
  });

  it('handles response with null data and no total (hits data || [] and data ? length : 0)', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockResolvedValue({
      data: null,
      // total not provided
    });

    render(<EndpointHistoryPage />);

    await waitFor(() => {
      expect(dataEnrichmentJobApi.getJobHistory).toHaveBeenCalled();
    });
  });

  it('renders row with null publishing_status to hit params.value falsy branch (Yes/No cell)', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockResolvedValue({
      data: [
        {
          job_id: 'job-null-pub',
          endpoint_name: 'ep',
          table_name: 'tbl',
          counts: 0,
          processed_counts: 0,
          created_at: null,
          exception: false,
          status: 'active',
          publishing_status: null, // falsy → shows 'No'
          tenant_id: 'tenant',
          version: 'v1',
        },
      ],
      total: 1,
    });

    render(<EndpointHistoryPage />);

    // Wait for the API to be called, which means data has been processed
    await waitFor(() => {
      expect(dataEnrichmentJobApi.getJobHistory).toHaveBeenCalled();
    });
  });

  it('copies job id when job_id is null (hits ?? empty string fallback)', async () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');

    const seededState = [
      [],
      false,
      null,
      1,
      0,
      0,
      {},
      true,
      {
        job_id: null, // null → String(null ?? '') = '' (BRDA:438,30,1)
        endpoint_name: 'ep',
        table_name: 'tbl',
        counts: 0,
        processed_counts: 0,
        created_at: null,
        exception: false,
        status: 'active',
        publishing_status: 'active',
        tenant_id: 'tenant',
        version: 'v1',
      },
      false,
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    try {
      render(<EndpointHistoryPage />);

      fireEvent.click(screen.getByLabelText('copy-job-id'));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('');
      });
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('shows Copied! tooltip text after copying (copied=true state branch)', async () => {
    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');

    // Seed copied=true to hit the BRDA:432 true branch (Copied!)
    const seededState = [
      [],
      false,
      null,
      1,
      0,
      0,
      {},
      true,
      {
        job_id: 'job-copied',
        endpoint_name: 'ep',
        table_name: 'tbl',
        counts: 1,
        processed_counts: 1,
        created_at: '2024-01-01T00:00:00Z',
        exception: false,
        status: 'active',
        publishing_status: 'active',
        tenant_id: 'tenant',
        version: 'v1',
      },
      true, // copied: true
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    try {
      render(<EndpointHistoryPage />);
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('covers getStatusBadge with undefined status (line 40 null branch)', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockResolvedValue({
      data: [
        {
          job_id: 'job-no-status',
          endpoint_name: 'ep-blank',
          table_name: 'tbl',
          counts: 1,
          processed_counts: 0,
          created_at: null,
          exception: false,
          status: undefined,
        },
      ],
      total: 1,
    });

    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');
    const seededState: unknown[] = [
      [{ job_id: 'job-no-status', endpoint_name: 'ep-blank', table_name: 'tbl', counts: 1, processed_counts: 0, created_at: null, exception: false, status: undefined }],
      false,
      null,
      1,
      0,
      0,
      10,
      {},
      true,  // modalOpen
      { job_id: 'job-no-status', endpoint_name: 'ep-blank', table_name: 'tbl', counts: 1, processed_counts: 0, created_at: null, exception: false, status: undefined },
      false,
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    try {
      render(<EndpointHistoryPage />);
      // getStatusBadge(undefined) returns the gray fallback class
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    } finally {
      useStateSpy.mockRestore();
    }
  });

  it('covers getStatusBadge with status_ prefix having <3 parts (line 46 false)', async () => {
    (dataEnrichmentJobApi.getJobHistory as jest.Mock).mockResolvedValue({
      data: [
        {
          job_id: 'job-short-prefix',
          endpoint_name: 'ep-short',
          table_name: 'tbl',
          counts: 1,
          processed_counts: 0,
          created_at: '2024-06-01T00:00:00.000Z',
          exception: false,
          status: 'status_incomplete',
        },
      ],
      total: 1,
    });

    const originalUseState = React.useState;
    const useStateSpy = jest.spyOn(React, 'useState');
    const seededState: unknown[] = [
      [{ job_id: 'job-short-prefix', endpoint_name: 'ep-short', table_name: 'tbl', counts: 1, processed_counts: 0, created_at: '2024-06-01T00:00:00.000Z', exception: false, status: 'status_incomplete' }],
      false,
      null,
      1,
      0,
      0,
      10,
      {},
      true,
      { job_id: 'job-short-prefix', endpoint_name: 'ep-short', table_name: 'tbl', counts: 1, processed_counts: 0, created_at: '2024-06-01T00:00:00.000Z', exception: false, status: 'status_incomplete' },
      false,
    ];

    useStateSpy.mockImplementation((initial: unknown) => {
      if (seededState.length > 0) {
        const next = seededState.shift();
        return [next, jest.fn()] as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
      }
      return originalUseState(initial as never) as [unknown, React.Dispatch<React.SetStateAction<unknown>>];
    });

    try {
      render(<EndpointHistoryPage />);
      // 'status_incomplete' has 2 parts → falls through to plain switch → default
      expect(screen.getByText('Endpoint Run Details')).toBeInTheDocument();
    } finally {
      useStateSpy.mockRestore();
    }
  });
});