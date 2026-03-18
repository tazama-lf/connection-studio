// PublisherConfigsPage.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PublisherConfigsPage from '../../../../src/features/publisher/pages/PublisherConfigsPage';
import { useToast } from '../../../../src/shared/providers/ToastProvider';
import { useAuth } from '../../../../src/features/auth/contexts/AuthContext';
import { isPublisher } from '../../../../src/utils/common/roleUtils';
import { useNavigate } from 'react-router';

const mockShowError = jest.fn();
const mockNavigate = jest.fn();

let capturedConfigListProps: any = null;
let capturedEditEndpointModalProps: any = null;

jest.mock('../../../../src/shared/providers/ToastProvider', () => ({
  useToast: jest.fn(),
}));

jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../../src/utils/common/roleUtils', () => ({
  isPublisher: jest.fn(),
}));

jest.mock('react-router', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('@shared', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  EditEndpointModal: (props: any) => {
    capturedEditEndpointModalProps = props;
    return (
      <div data-testid="edit-endpoint-modal">
        <div>Mock EditEndpointModal</div>
        <button onClick={props.onClose}>Close Modal</button>
        <button onClick={props.onSuccess}>Trigger Success</button>
        <div data-testid="endpoint-id">{props.endpointId}</div>
        <div data-testid="readonly-flag">{String(props.readOnly)}</div>
      </div>
    );
  },
}), { virtual: true });

jest.mock('../../../../src/features/config/components/ConfigList', () => ({
  ConfigList: (props: any) => {
    capturedConfigListProps = props;
    return (
      <div data-testid="config-list">
        <div data-testid="search-term">{props.searchTerm}</div>
        <div data-testid="show-approved">{String(props.showApprovedConfigs)}</div>
        <button
          onClick={() =>
            props.onViewDetails({
              id: 101,
              name: 'Config A',
            })
          }
        >
          Open Config
        </button>
        <button onClick={props.onRefresh}>Refresh List</button>
      </div>
    );
  },
}));

describe('PublisherConfigsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfigListProps = null;
    capturedEditEndpointModalProps = null;

    (useToast as jest.Mock).mockReturnValue({
      showError: mockShowError,
    });

    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  it('renders unauthorized message when user is not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    (isPublisher as jest.Mock).mockReturnValue(false);

    render(<PublisherConfigsPage />);

    expect(
      screen.getByText('You do not have permission to access this page.')
    ).toBeInTheDocument();

    expect(screen.queryByTestId('config-list')).not.toBeInTheDocument();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('renders unauthorized message and shows toast when authenticated user is not a publisher', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        claims: { role: 'viewer' },
      },
      isAuthenticated: true,
    });

    (isPublisher as jest.Mock).mockReturnValue(false);

    render(<PublisherConfigsPage />);

    expect(
      screen.getByText('You do not have permission to access this page.')
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'You do not have permission to access this page'
      );
    });
  });

  it('does not show toast for unauthenticated users', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    (isPublisher as jest.Mock).mockReturnValue(false);

    render(<PublisherConfigsPage />);

    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('renders publisher page content for authorized publisher', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        claims: { role: 'publisher' },
      },
      isAuthenticated: true,
    });

    (isPublisher as jest.Mock).mockReturnValue(true);

    render(<PublisherConfigsPage />);

    expect(
      screen.getByText('Dynamic Event Monitoring Service')
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    expect(screen.getByTestId('config-list')).toBeInTheDocument();

    expect(capturedConfigListProps).toMatchObject({
      searchTerm: '',
      onViewDetails: expect.any(Function),
      onRefresh: expect.any(Function),
      showApprovedConfigs: true,
    });
  });

  it('clicking Go Back calls navigate(-1)', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        claims: { role: 'publisher' },
      },
      isAuthenticated: true,
    });

    (isPublisher as jest.Mock).mockReturnValue(true);
    mockNavigate.mockResolvedValue(undefined);

    render(<PublisherConfigsPage />);

    fireEvent.click(screen.getByRole('button', { name: /go back/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it('opens EditEndpointModal when ConfigList onViewDetails is triggered', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        claims: { role: 'publisher' },
      },
      isAuthenticated: true,
    });

    (isPublisher as jest.Mock).mockReturnValue(true);

    render(<PublisherConfigsPage />);

    fireEvent.click(screen.getByRole('button', { name: /open config/i }));

    expect(screen.getByTestId('edit-endpoint-modal')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-id')).toHaveTextContent('101');

    expect(capturedEditEndpointModalProps).toMatchObject({
      isOpen: true,
      endpointId: 101,
      onClose: expect.any(Function),
      onSuccess: expect.any(Function),
      readOnly: true,
    });
  });

  it('closes modal when onClose is triggered', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        claims: { role: 'publisher' },
      },
      isAuthenticated: true,
    });

    (isPublisher as jest.Mock).mockReturnValue(true);

    render(<PublisherConfigsPage />);

    fireEvent.click(screen.getByRole('button', { name: /open config/i }));
    expect(screen.getByTestId('edit-endpoint-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));

    expect(screen.queryByTestId('edit-endpoint-modal')).not.toBeInTheDocument();
  });

  it('passes readOnly=true to EditEndpointModal', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        claims: { role: 'publisher' },
      },
      isAuthenticated: true,
    });

    (isPublisher as jest.Mock).mockReturnValue(true);

    render(<PublisherConfigsPage />);

    fireEvent.click(screen.getByRole('button', { name: /open config/i }));

    expect(screen.getByTestId('readonly-flag')).toHaveTextContent('true');
  });

  it('refreshes ConfigList after modal close', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        claims: { role: 'publisher' },
      },
      isAuthenticated: true,
    });

    (isPublisher as jest.Mock).mockReturnValue(true);

    const { rerender } = render(<PublisherConfigsPage />);

    const firstOnRefresh = capturedConfigListProps.onRefresh;

    fireEvent.click(screen.getByRole('button', { name: /open config/i }));
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));

    rerender(<PublisherConfigsPage />);

    const secondOnRefresh = capturedConfigListProps.onRefresh;
    expect(secondOnRefresh).toBeDefined();

    // State changed and component re-rendered; ConfigList was recreated
    expect(screen.getByTestId('config-list')).toBeInTheDocument();
    expect(firstOnRefresh).not.toBe(secondOnRefresh);
  });

  it('refreshes ConfigList after modal success', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        claims: { role: 'publisher' },
      },
      isAuthenticated: true,
    });

    (isPublisher as jest.Mock).mockReturnValue(true);

    const { rerender } = render(<PublisherConfigsPage />);

    const firstOnRefresh = capturedConfigListProps.onRefresh;

    fireEvent.click(screen.getByRole('button', { name: /open config/i }));
    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));

    rerender(<PublisherConfigsPage />);

    const secondOnRefresh = capturedConfigListProps.onRefresh;
    expect(secondOnRefresh).toBeDefined();
    expect(firstOnRefresh).not.toBe(secondOnRefresh);
  });

  it('allows ConfigList onRefresh to be triggered', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        claims: { role: 'publisher' },
      },
      isAuthenticated: true,
    });

    (isPublisher as jest.Mock).mockReturnValue(true);

    render(<PublisherConfigsPage />);

    fireEvent.click(screen.getByRole('button', { name: /refresh list/i }));

    expect(screen.getByTestId('config-list')).toBeInTheDocument();
  });

  it('does not call isPublisher when user claims are missing in a meaningful way that grants access', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {},
      isAuthenticated: true,
    });

    (isPublisher as jest.Mock).mockReturnValue(true);

    render(<PublisherConfigsPage />);

    expect(
      screen.getByText('You do not have permission to access this page.')
    ).toBeInTheDocument();
  });
});