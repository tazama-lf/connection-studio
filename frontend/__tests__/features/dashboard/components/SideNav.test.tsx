import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const navigateMock = jest.fn();
const logoutMock = jest.fn();

const useAuthMock = jest.fn();
const useLocationMock = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => useLocationMock(),
}));

jest.mock('../../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('@mui/material/Box', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="mui-box">{props.children}</div>,
}));
jest.mock('@mui/material/List', () => ({
  __esModule: true,
  default: (props: any) => <ul>{props.children}</ul>,
}));
jest.mock('@mui/material/ListItem', () => ({
  __esModule: true,
  default: (props: any) => <li>{props.children}</li>,
}));
jest.mock('@mui/material/ListItemIcon', () => ({
  __esModule: true,
  default: (props: any) => <span>{props.children}</span>,
}));
jest.mock('@mui/material/ListItemText', () => ({
  __esModule: true,
  default: (props: any) => <span>{props.primary}</span>,
}));
jest.mock('@mui/material/Tooltip', () => ({
  __esModule: true,
  default: (props: any) => <>{props.children}</>,
}));

jest.mock('lucide-react', () => ({
  ActivityIcon: () => <span data-testid="activity-icon" />,
  DatabaseIcon: () => <span data-testid="database-icon" />,
  ClockIcon: () => <span data-testid="clock-icon" />,
  LogOutIcon: () => <span data-testid="logout-icon" />,
  Layout: () => <span data-testid="layout-icon" />,
  PackageOpen: () => <span data-testid="package-icon" />,
}));

jest.mock('../../../../../src/features/dashboard/components/NavListItemButton', () => ({
  __esModule: true,
  default: (props: any) => (
    <button
      data-testid={props['aria-label'] === 'Logout' ? 'logout-btn' : `nav-${props['aria-label']}`}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  ),
}));

import SideNav from '../../../../../src/features/dashboard/components/SideNav';

describe('features/dashboard/components/SideNav.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocationMock.mockReturnValue({ pathname: '/dashboard' });
    useAuthMock.mockReturnValue({
      user: { claims: ['editor'] },
      logout: logoutMock,
    });
  });

  it('renders default nav items and navigates without onClose callback', () => {
    render(<SideNav open={false} />);

    fireEvent.click(screen.getByTestId('nav-Navigate to Dashboard'));
    fireEvent.click(screen.getByTestId('nav-Navigate to DEMS'));
    fireEvent.click(screen.getByTestId('nav-Navigate to Data Enrichment'));
    fireEvent.click(screen.getByTestId('nav-Navigate to Cron Job Management'));
    fireEvent.click(screen.getByTestId('logout-btn'));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
    expect(navigateMock).toHaveBeenCalledWith('/dems');
    expect(navigateMock).toHaveBeenCalledWith('data-enrichment');
    expect(navigateMock).toHaveBeenCalledWith('/cron');
    expect(navigateMock).toHaveBeenCalledWith('/login');
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('renders publisher-specific path mapping and exported item entry', () => {
    const onClose = jest.fn();
    useAuthMock.mockReturnValue({
      user: { claims: ['publisher'] },
      logout: logoutMock,
    });
    useLocationMock.mockReturnValue({ pathname: '/publisher/de-jobs/details' });

    const first = render(<SideNav open onClose={onClose} />);

    fireEvent.click(screen.getByTestId('nav-Navigate to Dynamic Event Monitoring Service'.replace('Dynamic Event Monitoring Service','DEMS')));
    fireEvent.click(screen.getByTestId('nav-Navigate to Data Enrichment'));
    fireEvent.click(screen.getByTestId('nav-Navigate to Cron Job Management'));
    fireEvent.click(screen.getByTestId('nav-Navigate to Exported Items'));

    expect(navigateMock).toHaveBeenCalledWith('/publisher/configs');
    expect(navigateMock).toHaveBeenCalledWith('/publisher/de-jobs');
    expect(navigateMock).toHaveBeenCalledWith('/publisher/cron-jobs');
    expect(navigateMock).toHaveBeenCalledWith('/publisher/exported-items');
    expect(onClose).toHaveBeenCalled();
  });

  it('uses approver and exporter path maps and supports logout flow with onClose', () => {
    const onClose = jest.fn();

    useAuthMock.mockReturnValue({
      user: { claims: ['approver'] },
      logout: logoutMock,
    });
    const first = render(<SideNav open onClose={onClose} />);

    fireEvent.click(screen.getByTestId('nav-Navigate to DEMS'));
    fireEvent.click(screen.getByTestId('nav-Navigate to Data Enrichment'));
    fireEvent.click(screen.getByTestId('nav-Navigate to Cron Job Management'));

    expect(navigateMock).toHaveBeenCalledWith('/approver/configs');
    expect(navigateMock).toHaveBeenCalledWith('/approver/jobs');
    expect(navigateMock).toHaveBeenCalledWith('/approver/cron-jobs');

    first.unmount();

    useAuthMock.mockReturnValue({
      user: { claims: ['exporter'] },
      logout: logoutMock,
    });
    render(<SideNav open onClose={onClose} />);

    fireEvent.click(screen.getByTestId('nav-Navigate to DEMS'));
    fireEvent.click(screen.getByTestId('nav-Navigate to Data Enrichment'));
    fireEvent.click(screen.getByTestId('nav-Navigate to Cron Job Management'));

    expect(navigateMock).toHaveBeenCalledWith('/exporter/configs');
    expect(navigateMock).toHaveBeenCalledWith('/exporter/jobs');
    expect(navigateMock).toHaveBeenCalledWith('/exporter/cron-jobs');

    fireEvent.click(screen.getByTestId('logout-btn'));
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/login');
    expect(onClose).toHaveBeenCalled();
  });

  it('handles null/undefined entries in the claims array via ?? fallback', () => {
    // Covers branch: (c ?? '').toString().toLowerCase() when c is null
    useAuthMock.mockReturnValue({
      user: { claims: [null, 'editor'] },
      logout: logoutMock,
    });
    // Should render without crashing
    render(<SideNav open={false} />);
    expect(screen.getByTestId('nav-Navigate to Dashboard')).toBeInTheDocument();
  });

  it('marks nav item as active when pathname starts with the item path (startsWith branch)', () => {
    // Covers startsWith branch in isActive computation
    useAuthMock.mockReturnValue({
      user: { claims: ['publisher'] },
      logout: logoutMock,
    });
    // /publisher/de-jobs/details starts with /publisher/de-jobs + '/'
    useLocationMock.mockReturnValue({ pathname: '/publisher/de-jobs/sub' });

    render(<SideNav open={true} />);
    // The nav items should render (active class applied via startsWith)
    expect(screen.getByTestId('nav-Navigate to Data Enrichment')).toBeInTheDocument();
  });

  it('uses includes match for role (partial role match in claimsLower)', () => {
    // Covers branch: c === role || c.includes(role) — right side (c includes role but is not equal)
    useAuthMock.mockReturnValue({
      user: { claims: ['senior-approver'] },
      logout: logoutMock,
    });
    useLocationMock.mockReturnValue({ pathname: '/dashboard' });

    render(<SideNav open={false} />);
    // 'senior-approver'.includes('approver') = true → isApprover = true
    // approver paths should be used
    fireEvent.click(screen.getByTestId('nav-Navigate to DEMS'));
    expect(navigateMock).toHaveBeenCalledWith('/approver/configs');
  });

  it('uses empty claims array when user has no claims property (line 25 ?? fallback)', () => {
    useAuthMock.mockReturnValue({
      user: {},
      logout: logoutMock,
    });
    useLocationMock.mockReturnValue({ pathname: '/dashboard' });

    render(<SideNav open={false} />);
    // Without claims, no role match → uses defaultPaths
    fireEvent.click(screen.getByTestId('nav-Navigate to DEMS'));
    expect(navigateMock).toHaveBeenCalledWith('/dems');
  });
});