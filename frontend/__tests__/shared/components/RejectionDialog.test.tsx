import React from 'react';
import { render, screen } from '@testing-library/react';
import { RejectionDialog } from '../../../src/shared/components/RejectionDialog';

describe('RejectionDialog', () => {
  const baseProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    configName: 'My Config',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dialog when open', () => {
    render(<RejectionDialog {...baseProps} />);
    expect(screen.getByText('Rejection Confirmation Required!')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<RejectionDialog {...baseProps} isOpen={false} />);
    expect(screen.queryByText('Rejection Confirmation Required!')).not.toBeInTheDocument();
  });

  it('shows the config name', () => {
    render(<RejectionDialog {...baseProps} />);
    expect(screen.getByText(/"My Config"/)).toBeInTheDocument();
  });

  it('uses Data Enrichment Job as the job type', () => {
    render(<RejectionDialog {...baseProps} />);
    expect(screen.getByText(/data enrichment job/i)).toBeInTheDocument();
  });
});
