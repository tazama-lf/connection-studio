import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PublisherDEMS from '../../../../src/features/publisher/components/PublisherDEMS';

describe('features/publisher/components/PublisherDEMS.tsx', () => {
  it('renders empty state and optional back action', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();

    render(<PublisherDEMS onBack={onBack} />);

    expect(screen.getByText('DEMS - Endpoint Deployment')).toBeInTheDocument();
    expect(screen.getByText('No endpoints ready for deployment')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Back to Dashboard/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders endpoint list branch and handles deploy click', async () => {
    const user = userEvent.setup();
    const useStateSpy = jest.spyOn(React, 'useState');

    useStateSpy.mockReturnValueOnce([
      [{ id: 1, name: 'Endpoint A', description: 'Desc' }],
      jest.fn(),
    ] as any);

    render(<PublisherDEMS />);

    expect(screen.getByText('Endpoint A')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deploy' }));
    useStateSpy.mockRestore();
  });
});