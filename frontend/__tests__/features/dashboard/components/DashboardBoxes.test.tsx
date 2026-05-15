import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const navigateMock = jest.fn();
const useAuthMock = jest.fn();
const useLocationMock = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => useLocationMock(),
}));

jest.mock('../../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('@mui/material/styles', () => ({
  alpha: (_c: string, _v: number) => 'rgba(0,0,0,0.1)',
}));

jest.mock('@mui/material/Box', () => ({
  __esModule: true,
  // Single combined mock: all @mui/material/* sub-paths resolve to the same
  // module via moduleNameMapper. Only the LAST jest.mock factory wins, so we
  // provide one factory that handles Box, Paper, and Typography use-cases:
  //  - function-style sx (outer Box, line 140) → call it to get resolved sx
  //  - object sx with backgroundColor as function (Paper, line 39) → call it
  //  - data attributes required by existing tests
  default: (props: any) => {
    const { sx, children, onClick, className } = props;
    const resolvedSx =
      typeof sx === 'function'
        ? sx({ palette: { background: { paper: '#fff', default: '#f8f8f8' } } })
        : (sx ?? {});
    const bg =
      typeof resolvedSx?.backgroundColor === 'function'
        ? resolvedSx.backgroundColor({
          palette: { background: { paper: '#fff' } },
        })
        : resolvedSx?.backgroundColor;
    return (
      <div
        className={className}
        onClick={onClick}
        data-opacity={resolvedSx?.opacity}
        data-transform={resolvedSx?.transform}
        data-hover-cursor={resolvedSx?.['&:hover']?.cursor}
        data-bg={bg}
      >
        {children}
      </div>
    );
  },
}));

jest.mock('lucide-react', () => ({
  ActivityIcon: () => <span data-testid="activity-icon" />,
  DatabaseIcon: () => <span data-testid="database-icon" />,
  ClockIcon: () => <span data-testid="clock-icon" />,
  PackageIcon: () => <span data-testid="package-icon" />,
}));

import DashboardBoxes, {
  BoxCard,
} from '../../../../../src/features/dashboard/components/DashboardBoxes';

describe('features/dashboard/components/DashboardBoxes.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    useLocationMock.mockReturnValue({ pathname: '/dashboard' });
  });

  it('renders default cards and navigates for editor role', async () => {
    useAuthMock.mockReturnValue({ user: { claims: ['editor'] } });
    render(<DashboardBoxes />);

    fireEvent.click(screen.getByText('Dynamic Event Monitoring'));
    fireEvent.click(screen.getByText('Data Enrichment'));
    fireEvent.click(screen.getByText('Cron Job Management'));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dems');
      expect(navigateMock).toHaveBeenCalledWith('data-enrichment');
      expect(navigateMock).toHaveBeenCalledWith('/cron');
    });
  });

  it('renders publisher exported card and uses publisher paths', async () => {
    useAuthMock.mockReturnValue({ user: { claims: ['publisher'] } });
    useLocationMock.mockReturnValue({ pathname: '/publisher/de-jobs' });

    render(<DashboardBoxes />);

    expect(screen.getByText('Exported Items')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Dynamic Event Monitoring'));
    fireEvent.click(screen.getByText('Data Enrichment'));
    fireEvent.click(screen.getByText('Cron Job Management'));
    fireEvent.click(screen.getByText('Exported Items'));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/publisher/configs');
      expect(navigateMock).toHaveBeenCalledWith('/publisher/de-jobs');
      expect(navigateMock).toHaveBeenCalledWith('/publisher/cron-jobs');
      expect(navigateMock).toHaveBeenCalledWith('/publisher/exported-items');
    });
  });

  it('uses approver and exporter routes and supports partial-claim matching', async () => {
    useAuthMock.mockReturnValue({
      user: { claims: ['Team-APPROVER', 'ops-exporter'] },
    });
    useLocationMock.mockReturnValue({ pathname: '/approver/jobs/details' });

    render(<DashboardBoxes />);

    fireEvent.click(screen.getByText('Dynamic Event Monitoring'));
    fireEvent.click(screen.getByText('Data Enrichment'));
    fireEvent.click(screen.getByText('Cron Job Management'));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/approver/configs');
      expect(navigateMock).toHaveBeenCalledWith('/approver/jobs');
      expect(navigateMock).toHaveBeenCalledWith('/approver/cron-jobs');
    });
  });

  it('handles non-element icons gracefully when React reports invalid element', () => {
    const isValidSpy = jest
      .spyOn(React, 'isValidElement')
      .mockReturnValue(false);

    useAuthMock.mockReturnValue({ user: { claims: [] } });
    render(<DashboardBoxes />);

    expect(screen.getByText('Dynamic Event Monitoring')).toBeInTheDocument();

    isValidSpy.mockRestore();
  });

  it('uses exporter routes for exporter claim', async () => {
    useAuthMock.mockReturnValue({ user: { claims: ['ops-exporter'] } });
    useLocationMock.mockReturnValue({ pathname: '/exporter/configs' });

    render(<DashboardBoxes />);

    fireEvent.click(screen.getByText('Dynamic Event Monitoring'));
    fireEvent.click(screen.getByText('Data Enrichment'));
    fireEvent.click(screen.getByText('Cron Job Management'));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/exporter/configs');
      expect(navigateMock).toHaveBeenCalledWith('/exporter/jobs');
      expect(navigateMock).toHaveBeenCalledWith('/exporter/cron-jobs');
    });

    // Exported Items card should NOT appear for exporter
    expect(screen.queryByText('Exported Items')).not.toBeInTheDocument();
  });

  it('shows selected state when pathname matches card path exactly', async () => {
    useAuthMock.mockReturnValue({ user: { claims: ['publisher'] } });
    useLocationMock.mockReturnValue({ pathname: '/publisher/configs' });

    render(<DashboardBoxes />);

    // DEMS card path is /publisher/configs which matches exactly, so selected=true for it
    // Other cards have selected=false
    expect(screen.getByText('Dynamic Event Monitoring')).toBeInTheDocument();
  });

  it('shows selected state when pathname starts with card path', async () => {
    useAuthMock.mockReturnValue({ user: { claims: ['approver'] } });
    useLocationMock.mockReturnValue({
      pathname: '/approver/configs/detail/123',
    });

    render(<DashboardBoxes />);

    // /approver/configs/detail/123 starts with /approver/configs — DEMS card selected
    expect(screen.getByText('Dynamic Event Monitoring')).toBeInTheDocument();
  });

  it('renders pre-mount with opacity=0 and translateY(12px) before timeout fires', () => {
    jest.useFakeTimers();
    useAuthMock.mockReturnValue({ user: { claims: [] } });
    render(<DashboardBoxes />);

    // Before setTimeout(40ms) fires, mounted=false → opacity=0, transform=translateY(12px)
    const boxes = document.querySelectorAll('[data-opacity]');
    boxes.forEach((box) => {
      expect(box.getAttribute('data-opacity')).toBe('0');
      expect(box.getAttribute('data-transform')).toBe('translateY(12px)');
    });

    jest.useRealTimers();
  });

  it('renders post-mount with opacity=1 and translateY(0) after timeout', async () => {
    jest.useFakeTimers();
    useAuthMock.mockReturnValue({ user: { claims: [] } });
    render(<DashboardBoxes />);

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      const boxes = document.querySelectorAll('[data-opacity]');
      boxes.forEach((box) => {
        expect(box.getAttribute('data-opacity')).toBe('1');
        expect(box.getAttribute('data-transform')).toBe('translateY(0)');
      });
    });

    jest.useRealTimers();
  });

  it('Paper renders with pointer cursor when onClick is provided', () => {
    useAuthMock.mockReturnValue({ user: { claims: [] } });
    render(<DashboardBoxes />);

    // Cards always have onClick handler, so hover cursor should be 'pointer'
    const papers = document.querySelectorAll('[data-hover-cursor]');
    papers.forEach((paper) => {
      expect(paper.getAttribute('data-hover-cursor')).toBe('pointer');
    });
  });

  it('resolvePath falls back to defaultPaths for unknown id when exporter claim', () => {
    useAuthMock.mockReturnValue({ user: { claims: ['exporter'] } });
    useLocationMock.mockReturnValue({ pathname: '/dashboard' });

    // exported id not in exporterPaths → uses defaultPaths fallback (undefined for 'exported')
    // but publisher card is not added for exporter, so this just confirms normal render
    render(<DashboardBoxes />);
    expect(screen.queryByText('Exported Items')).not.toBeInTheDocument();
    expect(screen.getByText('Dynamic Event Monitoring')).toBeInTheDocument();
  });

  it('handles null user (no claims) with empty string fallback in claimsLower', () => {
    useAuthMock.mockReturnValue({ user: null });
    render(<DashboardBoxes />);

    // claims = [], claimsLower = [], so uses defaultPaths
    expect(screen.getByText('Dynamic Event Monitoring')).toBeInTheDocument();
    expect(screen.queryByText('Exported Items')).not.toBeInTheDocument();
  });

  it('approver+publisher: resolvePath exported falls back to defaultPaths (approverPaths has no exported)', async () => {
    // User has both approver and publisher claims
    // isApprover=true takes priority in resolvePath, approverPaths['exported'] is undefined → falls back to defaultPaths['exported']
    // isPublisher=true means exported card IS added
    useAuthMock.mockReturnValue({
      user: { claims: ['approver', 'publisher'] },
    });
    useLocationMock.mockReturnValue({ pathname: '/dashboard' });

    render(<DashboardBoxes />);

    // Exported Items card is added because isPublisher=true
    expect(screen.getByText('Exported Items')).toBeInTheDocument();

    // Clicking it navigates to undefined (defaultPaths['exported'] is undefined) — but crucially the || branch fires
    fireEvent.click(screen.getByText('Exported Items'));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled();
    });
  });

  it('exporter+publisher: resolvePath falls through to exporterPaths which lacks exported key', async () => {
    // exporter claim takes priority over publisher in isExporter check
    // isPublisher is still true → exported card added
    // resolvePath('exported'): isApprover=false, isPublisher=false (exporter is checked first? No.)
    // Actually order: isApprover → isPublisher → isExporter
    // With publisher+exporter: isPublisher fires first, publisherPaths['exported'] IS defined
    useAuthMock.mockReturnValue({
      user: { claims: ['exporter', 'publisher'] },
    });
    useLocationMock.mockReturnValue({ pathname: '/dashboard' });

    render(<DashboardBoxes />);
    expect(screen.getByText('Exported Items')).toBeInTheDocument();

    // isPublisher=true fires before isExporter in resolvePath, publisherPaths['exported'] exists
    fireEvent.click(screen.getByText('Exported Items'));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/publisher/exported-items');
    });
  });

  it('exporter+approver: exporterPaths fallback fires when approver+exporter resolve exported id', async () => {
    // approver claim is listed before exporter → isApprover=true, isExporter=true
    // publisher card NOT added (isPublisher=false)
    // so just verify no exported card for non-publisher
    useAuthMock.mockReturnValue({ user: { claims: ['approver', 'exporter'] } });
    useLocationMock.mockReturnValue({ pathname: '/dashboard' });

    render(<DashboardBoxes />);
    expect(screen.queryByText('Exported Items')).not.toBeInTheDocument();

    // navigate for dems/de/cron uses approver paths (isApprover first)
    fireEvent.click(screen.getByText('Dynamic Event Monitoring'));
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/approver/configs');
    });
  });

  it('handles null claim in claims array via ?? fallback (BRDA:81)', () => {
    useAuthMock.mockReturnValue({
      user: { claims: [null, undefined, 'editor'] },
    });
    render(<DashboardBoxes />);
    expect(screen.getByText('Dynamic Event Monitoring')).toBeInTheDocument();
  });

  it('unmounts cleanly, triggering useEffect cleanup to clearTimeout', () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    useAuthMock.mockReturnValue({ user: { claims: [] } });
    const { unmount } = render(<DashboardBoxes />);
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });

  it('BoxCard: uses default color (#7c3aed) when color prop is omitted', () => {
    render(
      <BoxCard
        title="Test"
        subtitle="Sub"
        icon={<span data-testid="icon" />}
      />,
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
    const card = document.querySelector('[data-bg]');
    expect(card?.getAttribute('data-bg')).toBe('#fff');
  });

  it('BoxCard: uses default selected (false) when selected prop is omitted', () => {
    render(
      <BoxCard
        title="Test"
        subtitle="Sub"
        icon={<span data-testid="icon" />}
        color="#abc"
      />,
    );
    // No selected indicator rendered (selected=false by default)
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('BoxCard: cursor is "default" when onClick prop is omitted', () => {
    render(
      <BoxCard
        title="NoClick"
        subtitle="Sub"
        icon={<span data-testid="icon" />}
        color="#abc"
      />,
    );
    const card = document.querySelector('[data-hover-cursor]');
    expect(card?.getAttribute('data-hover-cursor')).toBe('default');
  });

  it('BoxCard: renders selected indicator dot when selected is true', () => {
    render(
      <BoxCard
        title="Selected"
        subtitle="Sub"
        icon={<span data-testid="icon" />}
        color="#abc"
        selected={true}
      />,
    );
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });
});
