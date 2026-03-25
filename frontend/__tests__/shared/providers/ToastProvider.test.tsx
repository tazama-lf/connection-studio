import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../../../src/shared/providers/ToastProvider';

// Consumer component used in tests
const ToastConsumer: React.FC<{ action?: string; title?: string; message?: string }> = ({
  action = 'success',
  title = 'Test Title',
  message = 'Test message',
}) => {
  const toast = useToast();
  return (
    <div>
      <button
        onClick={() => {
          if (action === 'success') toast.showSuccess(title, message);
          else if (action === 'error') toast.showError(title, message);
          else if (action === 'warning') toast.showWarning(title, message);
          else if (action === 'info') toast.showInfo(title, message);
          else if (action === 'add')
            toast.addToast({ type: 'success', title, message });
          else if (action === 'remove') toast.removeToast('fake-id');
        }}
      >
        trigger
      </button>
    </div>
  );
};

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders children without crashing', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Hello</div>
      </ToastProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows a success toast when showSuccess is called', async () => {
    render(
      <ToastProvider>
        <ToastConsumer action="success" title="Success!" message="All good" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('trigger'));

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('shows an error toast when showError is called', async () => {
    render(
      <ToastProvider>
        <ToastConsumer action="error" title="Oops!" message="Something went wrong" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('trigger'));

    expect(screen.getByText('Oops!')).toBeInTheDocument();
  });

  it('shows a warning toast when showWarning is called', async () => {
    render(
      <ToastProvider>
        <ToastConsumer action="warning" title="Warning!" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('trigger'));

    expect(screen.getByText('Warning!')).toBeInTheDocument();
  });

  it('shows an info toast when showInfo is called', async () => {
    render(
      <ToastProvider>
        <ToastConsumer action="info" title="FYI" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('trigger'));

    expect(screen.getByText('FYI')).toBeInTheDocument();
  });

  it('adds a toast with addToast', async () => {
    render(
      <ToastProvider>
        <ToastConsumer action="add" title="Direct Add" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('trigger'));

    expect(screen.getByText('Direct Add')).toBeInTheDocument();
  });

  it('removes a toast (removeToast with non-existent id is a no-op)', async () => {
    render(
      <ToastProvider>
        <ToastConsumer action="remove" title="Toast" />
      </ToastProvider>,
    );

    // Should not throw
    fireEvent.click(screen.getByText('trigger'));
  });

  it('auto-removes a toast after duration elapses', async () => {
    render(
      <ToastProvider>
        <ToastConsumer action="success" title="Temporary" message="Will vanish" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('trigger'));

    expect(screen.getByText('Temporary')).toBeInTheDocument();

    // Advance past the default 5000ms duration + 300ms animation
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Temporary')).not.toBeInTheDocument();
    });
  });
});

describe('useToast outside provider', () => {
  it('throws when useToast is called outside ToastProvider', () => {
    const OutsideComponent = () => {
      useToast();
      return <div>outside</div>;
    };

    expect(() => render(<OutsideComponent />)).toThrow(
      'useToast must be used within a ToastProvider',
    );
  });

  it('returns toast api when used inside ToastProvider', () => {
    const ThrowingComponent = () => {
      const toast = useToast();
      return <div>{typeof toast.showSuccess === 'function' ? 'ready' : 'missing'}</div>;
    };

    render(
      <ToastProvider>
        <ThrowingComponent />
      </ToastProvider>,
    );

    expect(screen.getByText('ready')).toBeInTheDocument();
  });
});
