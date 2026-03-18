import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const useAuthMock = jest.fn();
const useLocationMock = jest.fn();

jest.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="outlet" />,
  useLocation: () => useLocationMock(),
}));

jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('../../../../src/features/dashboard/components/TopBar', () => (props: any) => (
  <button onClick={props.onToggle}>toggle</button>
));

jest.mock('../../../../src/features/dashboard/components/SideNav', () => (props: any) => (
  <div data-testid="sidenav">
    {String(props.open)}
    <button onClick={props.onClose}>close-nav</button>
  </div>
));

jest.mock('../../../../src/features/dashboard/components/Drawer', () => (props: any) => (
  <div data-testid="drawer">{String(props.open)}{props.children}</div>
));

jest.mock('../../../../src/features/dashboard/components/DashboardBoxes', () => () => (
  <div data-testid="dashboard-boxes" />
));

jest.mock('@mui/material/styles', () => ({
  styled:
    (Comp: any) =>
    (styles?: any) =>
    (props: any) => {
      if (typeof styles === 'function') {
        styles({
          theme: {
            spacing: () => '0px',
            breakpoints: { up: () => '@media' },
          },
        });
      }
      return <Comp {...props} />;
    },
}));

jest.mock('@mui/material/AppBar', () => (props: any) => <div>{props.children}</div>);
jest.mock('@mui/material/CssBaseline', () => () => <div data-testid="css-baseline" />);
jest.mock('@mui/material/Box', () => (props: any) => {
  if (typeof props.sx === 'function') {
    props.sx({
      spacing: (v: number) => `${v * 8}px`,
      breakpoints: { up: () => '@media' },
    });
  }
  return <div>{props.children}</div>;
});

import Dashboard from '../../../../src/features/dashboard/Dashboard';

describe('features/dashboard/Dashboard.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocationMock.mockReturnValue({ pathname: '/dashboard' });
    useAuthMock.mockReturnValue({ user: { claims: ['editor'] } });
  });

  it('renders layout and shows boxes for allowed role on dashboard route', () => {
    render(<Dashboard />);

    expect(screen.getByTestId('dashboard-boxes')).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('toggles drawer open state via topbar button', () => {
    render(<Dashboard />);

    expect(screen.getByTestId('drawer')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('drawer')).toHaveTextContent('true');
  });

  it('hides boxes outside dashboard route or when role is not allowed', () => {
    const { rerender } = render(<Dashboard />);
    expect(screen.getByTestId('dashboard-boxes')).toBeInTheDocument();

    useLocationMock.mockReturnValue({ pathname: '/dems' });
    rerender(<Dashboard />);
    expect(screen.queryByTestId('dashboard-boxes')).not.toBeInTheDocument();

    useLocationMock.mockReturnValue({ pathname: '/dashboard' });
    useAuthMock.mockReturnValue({ user: { claims: ['viewer'] } });
    rerender(<Dashboard />);
    expect(screen.queryByTestId('dashboard-boxes')).not.toBeInTheDocument();

    useAuthMock.mockReturnValue({ user: null });
    rerender(<Dashboard />);
    expect(screen.queryByTestId('dashboard-boxes')).not.toBeInTheDocument();
  });

  it('closes drawer through SideNav onClose callback', () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('drawer')).toHaveTextContent('true');

    fireEvent.click(screen.getByText('close-nav'));
    expect(screen.getByTestId('drawer')).toHaveTextContent('false');
  });
});
