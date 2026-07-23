import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileCorruptionError } from '../../../src/shared/components/FileCorruptionError';

describe('FileCorruptionError', () => {
  it('renders the heading', () => {
    render(<FileCorruptionError />);
    expect(screen.getByText('File Corruption Detected')).toBeInTheDocument();
  });

  it('renders generic message when fileName is not provided', () => {
    render(<FileCorruptionError />);
    expect(
      screen.getByText(
        'The requested file appears to be corrupted or missing.',
      ),
    ).toBeInTheDocument();
  });

  it('renders file name when provided', () => {
    render(<FileCorruptionError fileName="transaction.json" />);
    expect(screen.getByText('transaction.json')).toBeInTheDocument();
  });

  it('renders the list of corruption causes', () => {
    render(<FileCorruptionError />);
    expect(screen.getByText('Incomplete file transfer')).toBeInTheDocument();
    expect(
      screen.getByText('Data integrity verification failure'),
    ).toBeInTheDocument();
    expect(screen.getByText('File system corruption')).toBeInTheDocument();
    expect(
      screen.getByText('Network interruption during file creation'),
    ).toBeInTheDocument();
  });

  it('renders the Retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<FileCorruptionError onRetry={onRetry} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls onRetry when Retry button clicked', () => {
    const onRetry = jest.fn();
    render(<FileCorruptionError onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides Retry button when onRetry is not provided', () => {
    render(<FileCorruptionError />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('renders the Close button when onClose is provided', () => {
    const onClose = jest.fn();
    render(<FileCorruptionError onClose={onClose} />);
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('calls onClose when Close button clicked', () => {
    const onClose = jest.fn();
    render(<FileCorruptionError onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides Close button when onClose is not provided', () => {
    render(<FileCorruptionError />);
    expect(screen.queryByText('Close')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FileCorruptionError className="my-custom-class" />,
    );
    expect(container.firstChild).toHaveClass('my-custom-class');
  });

  it('renders both Retry and Close buttons together', () => {
    render(<FileCorruptionError onRetry={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });
});
