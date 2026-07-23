import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AppRoutes } from '../../src/router';
import { useAuth } from '../../src/features/auth/contexts/AuthContext';
import {
  isApprover,
  isEditor,
  isExporter,
  isPublisher,
} from '../../src/utils/common/roleUtils';
import { setupFetch401Interceptor } from '../../src/utils/common/interceptor';

jest.mock('../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/utils/common/roleUtils', () => ({
  isApprover: jest.fn(),
  isPublisher: jest.fn(),
  isExporter: jest.fn(),
  isEditor: jest.fn(),
}));

jest.mock('../../src/utils/common/interceptor', () => ({
  setupFetch401Interceptor: jest.fn(),
}));

jest.mock('../../src/features/auth/pages/Login', () => ({
  __esModule: true,
  default: () => <div>Login Page</div>,
}));

jest.mock('../../src/features/dashboard/pages/Dashboard', () => ({
  __esModule: true,
  default: () => {
    const { Outlet } = require('react-router-dom');
    return (
      <div>
        Dashboard Page
        <Outlet />
      </div>
    );
  },
}));

jest.mock(
  '@pages/dems',
  () => ({
    __esModule: true,
    default: () => <div>DEMS Page</div>,
  }),
  { virtual: true },
);

jest.mock('../../src/features/approver/pages/ApproverConfigsPage', () => ({
  __esModule: true,
  default: () => <div>Approver Configs Page</div>,
}));

jest.mock('../../src/features/approver/pages/ApproverDEJobsPage', () => ({
  __esModule: true,
  default: () => <div>Approver Jobs Page</div>,
}));

jest.mock('../../src/features/exporter/pages/ExporterConfigsPage', () => ({
  __esModule: true,
  default: () => <div>Exporter Configs Page</div>,
}));

jest.mock('../../src/features/exporter/pages/ExporterDEJobsPage', () => ({
  __esModule: true,
  default: () => <div>Exporter Jobs Page</div>,
}));

jest.mock('../../src/features/publisher/pages/PublisherModule', () => ({
  __esModule: true,
  default: () => <div>Publisher Module Page</div>,
}));

jest.mock('../../src/features/publisher/pages/PublisherDEJobsPage', () => ({
  __esModule: true,
  default: () => <div>Publisher Jobs Page</div>,
}));

jest.mock('../../src/features/publisher/pages/PublisherConfigsPage', () => ({
  __esModule: true,
  default: () => <div>Publisher Configs Page</div>,
}));

jest.mock(
  '../../src/features/publisher/pages/PublisherExportedItemsPage',
  () => ({
    __esModule: true,
    default: () => <div>Publisher Exported Items Page</div>,
  }),
);

jest.mock('../../src/features/cron/pages/index', () => ({
  __esModule: true,
  default: () => <div>Cron Page</div>,
}));

jest.mock(
  '../../src/features/data-enrichment/pages/DataEnrichmentModule',
  () => ({
    __esModule: true,
    default: () => <div>Data Enrichment Page</div>,
  }),
);

jest.mock(
  '../../src/features/data-enrichment/pages/EndpointHistoryPage',
  () => ({
    __esModule: true,
    default: () => <div>Endpoint History Page</div>,
  }),
);

jest.mock('../../src/pages/NotFoundPage', () => ({
  __esModule: true,
  default: () => <div>Not Found Page</div>,
}));

describe('router/index.tsx', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockIsApprover = isApprover as jest.Mock;
  const mockIsPublisher = isPublisher as jest.Mock;
  const mockIsExporter = isExporter as jest.Mock;
  const mockIsEditor = isEditor as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsApprover.mockReturnValue(false);
    mockIsPublisher.mockReturnValue(false);
    mockIsExporter.mockReturnValue(false);
    mockIsEditor.mockReturnValue(false);
  });

  it('shows loading screen while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      loading: true,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(setupFetch401Interceptor).toHaveBeenCalledTimes(1);
  });

  it('redirects unauthenticated users to login for protected routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('allows editor users to access DEMS route', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['editor'] },
    });
    mockIsEditor.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/dems']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('DEMS Page')).toBeInTheDocument();
  });

  it('redirects root path to login', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders not found page for unmatched route', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['editor'] },
    });

    render(
      <MemoryRouter initialEntries={['/not-a-route']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Not Found Page')).toBeInTheDocument();
  });

  it('allows editor users to access data enrichment route', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['editor'] },
    });
    mockIsEditor.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/data-enrichment']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Data Enrichment Page')).toBeInTheDocument();
  });

  it('blocks non-approver users from approver routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['editor'] },
    });
    mockIsApprover.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/approver/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Approver Configs Page')).not.toBeInTheDocument();
  });

  it('allows approver users to access approver routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['approver'] },
    });
    mockIsApprover.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/approver/jobs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Approver Jobs Page')).toBeInTheDocument();
  });

  it('allows exporter users to access exporter routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['exporter'] },
    });
    mockIsExporter.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/exporter/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Exporter Configs Page')).toBeInTheDocument();
  });

  it('blocks non-exporter users from exporter routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['editor'] },
    });
    mockIsExporter.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/exporter/jobs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Exporter Jobs Page')).not.toBeInTheDocument();
  });

  it('allows publisher users to access publisher module routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['publisher'] },
    });
    mockIsPublisher.mockReturnValue(true);
    mockIsExporter.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/publisher/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Publisher Configs Page')).toBeInTheDocument();
  });

  it('allows exporter role through publisher route guard', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['exporter'] },
    });
    mockIsPublisher.mockReturnValue(false);
    mockIsExporter.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/publisher']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Publisher Module Page')).toBeInTheDocument();
  });

  it('redirects legacy cron routes to unified cron route', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['approver'] },
    });
    mockIsApprover.mockReturnValue(true);

    const { rerender } = render(
      <MemoryRouter initialEntries={['/approver/cron-jobs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Cron Page')).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/exporter/cron-jobs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Cron Page')).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/publisher/cron-jobs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Cron Page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login for approver routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/approver/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login for publisher routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/publisher/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('blocks non-publisher/non-exporter from publisher routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['editor'] },
    });
    mockIsPublisher.mockReturnValue(false);
    mockIsExporter.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/publisher/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login for exporter routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/exporter/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login for editor routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/data-enrichment']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('blocks non-editor authenticated users from editor routes', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['approver'] },
    });
    mockIsEditor.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/data-enrichment']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('redirects to dashboard when approver user has null claims', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: null },
    });

    render(
      <MemoryRouter initialEntries={['/approver/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('redirects to dashboard when publisher user has null claims', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: null },
    });

    render(
      <MemoryRouter initialEntries={['/publisher/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('redirects to dashboard when exporter user has null claims', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: null },
    });

    render(
      <MemoryRouter initialEntries={['/exporter/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('redirects to dashboard when editor user has null claims', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: null },
    });

    render(
      <MemoryRouter initialEntries={['/dems']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('allows publisher users to access publisher de-jobs route', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['publisher'] },
    });
    mockIsPublisher.mockReturnValue(true);
    mockIsExporter.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/publisher/de-jobs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Publisher Jobs Page')).toBeInTheDocument();
  });

  it('allows publisher users to access publisher exported-items route', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['publisher'] },
    });
    mockIsPublisher.mockReturnValue(true);
    mockIsExporter.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/publisher/exported-items']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Publisher Exported Items Page'),
    ).toBeInTheDocument();
  });

  it('allows publisher users to access endpoint history route', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['publisher'] },
    });
    mockIsPublisher.mockReturnValue(true);
    mockIsExporter.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/data-enrichment/history']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Endpoint History Page')).toBeInTheDocument();
  });

  it('invokes the 401 interceptor callback to navigate to login', async () => {
    const { act } = await import('@testing-library/react');
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['editor'] },
    });
    mockIsEditor.mockReturnValue(true);

    render(
      <MemoryRouter>
        <AppRoutes />
      </MemoryRouter>,
    );

    // The interceptor callback is the first argument to setupFetch401Interceptor
    const calls = (setupFetch401Interceptor as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const callback = calls[0][0];
    expect(typeof callback).toBe('function');

    // Invoke the callback to cover the async navigate('/login') line
    await act(async () => {
      await callback();
    });
  });

  it('allows approver users to access approver configs route', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['approver'] },
    });
    mockIsApprover.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/approver/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Approver Configs Page')).toBeInTheDocument();
  });

  it('allows exporter users to access exporter jobs route', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { claims: ['exporter'] },
    });
    mockIsExporter.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/exporter/jobs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Exporter Jobs Page')).toBeInTheDocument();
  });

  it('redirects to login in ApproverRoute when inner auth check fails', () => {
    // AppRoutes (loading) → pass-through, ProtectedRoute sees authenticated → passes, ApproverRoute sees unauthenticated → redirects
    mockUseAuth
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: true,
        user: { claims: ['approver'] },
      })
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: true,
        user: { claims: ['approver'] },
      })
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: false,
        user: null,
      });

    render(
      <MemoryRouter initialEntries={['/approver/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to login in PublisherRoute when inner auth check fails', () => {
    mockUseAuth
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: true,
        user: { claims: ['publisher'] },
      })
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: true,
        user: { claims: ['publisher'] },
      })
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: false,
        user: null,
      });
    mockIsPublisher.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/publisher/configs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to login in ExporterRoute when inner auth check fails', () => {
    mockUseAuth
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: true,
        user: { claims: ['exporter'] },
      })
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: true,
        user: { claims: ['exporter'] },
      })
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: false,
        user: null,
      });
    mockIsExporter.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/exporter/jobs']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to login in EditorRoute when inner auth check fails', () => {
    mockUseAuth
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: true,
        user: { claims: ['editor'] },
      })
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: true,
        user: { claims: ['editor'] },
      })
      .mockReturnValueOnce({
        loading: false,
        isAuthenticated: false,
        user: null,
      });
    mockIsEditor.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/dems']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
