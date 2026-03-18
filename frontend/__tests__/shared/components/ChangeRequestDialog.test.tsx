import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChangeRequestDialog } from '../../../src/shared/components/ChangeRequestDialog';

describe('ChangeRequestDialog', () => {
  const baseProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    configName: 'Payments Config',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(<ChangeRequestDialog {...baseProps} />);
    expect(screen.getByText('Rejection Confirmation Required!')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ChangeRequestDialog {...baseProps} isOpen={false} />);
    expect(screen.queryByText('Rejection Confirmation Required!')).not.toBeInTheDocument();
  });

  it('shows the configName in the dialog', () => {
    render(<ChangeRequestDialog {...baseProps} />);
    expect(screen.getByText(/"Payments Config"/)).toBeInTheDocument();
  });

  it('uses Data Enrichment Job label', () => {
    render(<ChangeRequestDialog {...baseProps} />);
    expect(screen.getByText(/data enrichment job/i)).toBeInTheDocument();
  });
});
