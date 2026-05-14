import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('lucide-react', () => ({
  XIcon: () => <span data-testid="x-icon" />,
}));

import VersionHistoryModal from '../../../../../src/features/config/components/VersionHistoryModal';

describe('features/config/components/VersionHistoryModal.tsx', () => {
  it('returns null when closed', () => {
    const { container } = render(
      <VersionHistoryModal isOpen={false} onClose={jest.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders default versions and close action', () => {
    const onClose = jest.fn();
    render(<VersionHistoryModal isOpen onClose={onClose} />);

    expect(screen.getByText('Version History')).toBeInTheDocument();
    expect(screen.getByText('DEVELOPMENT')).toBeInTheDocument();
    expect(screen.getByText('DEPLOYED')).toBeInTheDocument();
    expect(screen.getByText('Updated schema validation')).toBeInTheDocument();
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders provided versions and default status badge branch', () => {
    render(
      <VersionHistoryModal
        isOpen
        onClose={jest.fn()}
        config={{
          id: 1,
          endpointPath: '/e',
          versions: [
            {
              version: 'v3',
              status: 'UNKNOWN' as any,
              releaseDate: '2024-01-01',
              releasedBy: 'Alex',
              changes: ['Changed mappings'],
            },
          ],
        }}
      />,
    );

    expect(screen.getAllByText('v3').length).toBe(2);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText('Changed mappings')).toBeInTheDocument();
  });
});
