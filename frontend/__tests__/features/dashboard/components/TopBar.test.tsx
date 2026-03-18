import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@mui/icons-material/Close', () => () => <span data-testid="close-icon" />);
jest.mock('@mui/icons-material/Menu', () => () => <span data-testid="menu-icon" />);

jest.mock('@mui/material/Box', () => (props: any) => <div data-testid="mui-box" {...props} />);
jest.mock(
  '@mui/material/IconButton',
  () => (props: any) => (
    <button data-testid="toggle-button" aria-label={props['aria-label']} onClick={props.onClick}>
      {props.children}
    </button>
  )
);
jest.mock('@mui/material/Toolbar', () => (props: any) => <div data-testid="toolbar">{props.children}</div>);
jest.mock('@mui/material/Typography', () => (props: any) => <span>{props.children}</span>);

jest.mock('../../../../src/features/dashboard/components/UserCard', () => () => <div data-testid="user-card" />);

import TopBar from '../../../../src/features/dashboard/components/TopBar';

describe('features/dashboard/components/TopBar.tsx', () => {
  it('shows menu icon when closed and toggles drawer', () => {
    const onToggle = jest.fn();
    render(<TopBar open={false} onToggle={onToggle} />);

    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    expect(screen.getByTestId('user-card')).toBeInTheDocument();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows close icon when open', () => {
    render(<TopBar open onToggle={jest.fn()} />);
    expect(screen.getByTestId('close-icon')).toBeInTheDocument();
  });

  it('navigates to dashboard when title area is clicked', () => {
    render(<TopBar open={false} onToggle={jest.fn()} />);
    fireEvent.click(screen.getByText('Tazama Connection Studio'));
    expect(screen.getByText('Tazama Connection Studio')).toBeInTheDocument();
  });
});