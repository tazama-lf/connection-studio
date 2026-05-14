import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToastComponent from '../../../src/shared/components/Toast';
import type { Toast } from '../../../src/shared/components/Toast';

const baseToast: Toast = {
  id: 'test-id',
  type: 'success',
  title: 'Success Title',
  message: 'Success message',
  duration: 5000,
};

describe('ToastComponent - rendering', () => {
  it('renders the title', () => {
    render(<ToastComponent toast={baseToast} onRemove={jest.fn()} />);
    expect(screen.getByText('Success Title')).toBeInTheDocument();
  });

  it('renders the message when provided', () => {
    render(<ToastComponent toast={baseToast} onRemove={jest.fn()} />);
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('does not render message when absent', () => {
    const toast: Toast = { id: '1', type: 'info', title: 'Info only' };
    render(<ToastComponent toast={toast} onRemove={jest.fn()} />);
    expect(screen.getByText('Info only')).toBeInTheDocument();
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
  });

  it('renders success type', () => {
    render(
      <ToastComponent
        toast={{ ...baseToast, type: 'success' }}
        onRemove={jest.fn()}
      />,
    );
    expect(screen.getByText('Success Title')).toBeInTheDocument();
  });

  it('renders error type', () => {
    render(
      <ToastComponent
        toast={{ ...baseToast, type: 'error', title: 'Error!' }}
        onRemove={jest.fn()}
      />,
    );
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('renders warning type', () => {
    render(
      <ToastComponent
        toast={{ ...baseToast, type: 'warning', title: 'Warning!' }}
        onRemove={jest.fn()}
      />,
    );
    expect(screen.getByText('Warning!')).toBeInTheDocument();
  });

  it('renders info type', () => {
    render(
      <ToastComponent
        toast={{ ...baseToast, type: 'info', title: 'Info!' }}
        onRemove={jest.fn()}
      />,
    );
    expect(screen.getByText('Info!')).toBeInTheDocument();
  });

  it('applies green background for success', () => {
    const { container } = render(
      <ToastComponent
        toast={{ ...baseToast, type: 'success' }}
        onRemove={jest.fn()}
      />,
    );
    expect(container.innerHTML).toContain('bg-green-50');
  });

  it('applies red background for error', () => {
    const { container } = render(
      <ToastComponent
        toast={{ ...baseToast, type: 'error' }}
        onRemove={jest.fn()}
      />,
    );
    expect(container.innerHTML).toContain('bg-red-50');
  });

  it('applies yellow background for warning', () => {
    const { container } = render(
      <ToastComponent
        toast={{ ...baseToast, type: 'warning' }}
        onRemove={jest.fn()}
      />,
    );
    expect(container.innerHTML).toContain('bg-yellow-50');
  });

  it('applies blue background for info', () => {
    const { container } = render(
      <ToastComponent
        toast={{ ...baseToast, type: 'info' }}
        onRemove={jest.fn()}
      />,
    );
    expect(container.innerHTML).toContain('bg-blue-50');
  });

  it('renders a close button', () => {
    render(<ToastComponent toast={baseToast} onRemove={jest.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('ToastComponent - timers', () => {
  let onRemove: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    onRemove = jest.fn();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('calls onRemove after duration + animation delay', async () => {
    const toast: Toast = { ...baseToast, duration: 1000 };
    render(<ToastComponent toast={toast} onRemove={onRemove} />);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(onRemove).toHaveBeenCalledWith('test-id');
  });

  it('uses default duration of 5000ms', async () => {
    const toast: Toast = { id: 'def-id', type: 'info', title: 'Default' };
    render(<ToastComponent toast={toast} onRemove={onRemove} />);

    await act(async () => {
      jest.advanceTimersByTime(5300);
    });

    expect(onRemove).toHaveBeenCalledWith('def-id');
  });

  it('calls onRemove when close button is clicked', async () => {
    render(<ToastComponent toast={baseToast} onRemove={onRemove} />);
    const closeButton = screen.getByRole('button');
    await act(async () => {
      closeButton.click();
    });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(onRemove).toHaveBeenCalledWith('test-id');
  });
});
