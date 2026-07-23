import React from 'react';
import { render, screen } from '@testing-library/react';

const useAuthMock = jest.fn();

jest.mock('@mui/material/Typography', () => (props: any) => (
  <span>{props.children}</span>
));
jest.mock('@mui/material/Box', () => (props: any) => (
  <div>{props.children}</div>
));

jest.mock('../../../../src/features/auth/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

import UserCard from '../../../../src/features/dashboard/components/UserCard';

describe('features/dashboard/components/UserCard.tsx', () => {
  it('renders username and mapped primary role', () => {
    useAuthMock.mockReturnValue({
      user: {
        username: 'sam',
        claims: ['unknown', 'publisher', 'editor'],
      },
    });

    render(<UserCard />);

    expect(screen.getByText('sam')).toBeInTheDocument();
    expect(screen.getByText('- Publisher')).toBeInTheDocument();
  });

  it('renders empty role text when user has no claims', () => {
    useAuthMock.mockReturnValue({ user: { username: 'jane', claims: [] } });

    render(<UserCard />);

    expect(screen.getByText('jane')).toBeInTheDocument();
    expect(screen.queryByText(/- /)).not.toBeInTheDocument();
  });

  it('handles missing user safely', () => {
    useAuthMock.mockReturnValue({ user: null });

    render(<UserCard />);

    expect(screen.getAllByText('').length).toBeGreaterThan(0);
  });

  it('returns no primary role for unmapped claims', () => {
    useAuthMock.mockReturnValue({
      user: {
        username: 'nora',
        claims: ['unknown-only'],
      },
    });

    render(<UserCard />);

    expect(screen.getByText('nora')).toBeInTheDocument();
    expect(screen.queryByText(/- /)).not.toBeInTheDocument();
  });
});
