import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EndpointHistoryModal } from '../../../src/shared/components/EndpointHistoryModal';

describe('shared/components/EndpointHistoryModal.tsx', () => {
  it('renders versions and both status variants', () => {
    render(<EndpointHistoryModal endpointId={1} onClose={() => {}} />);

    expect(screen.getByText('Version History')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('DEPLOYED')).toBeInTheDocument();
    expect(screen.getByText('DEVELOPMENT')).toBeInTheDocument();
    expect(screen.getByText(/Released on 2023-10-15/)).toBeInTheDocument();
    expect(screen.getByText(/Released on 2023-11-10/)).toBeInTheDocument();
  });

  it('calls onClose from backdrop and close button', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    const { container } = render(<EndpointHistoryModal endpointId={1} onClose={onClose} />);
    const backdrop = container.querySelector('.absolute.inset-0.backdrop-blur-sm.backdrop-saturate-150');
    expect(backdrop).toBeTruthy();

    await user.click(backdrop as Element);
    await user.click(screen.getByRole('button'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});