import React from 'react';
import { render, screen } from '@testing-library/react';

const styleCalls: Array<Record<string, any>> = [];
let capturedOptions: any;

const theme = {
  transitions: {
    create: jest.fn(() => 'transition-width'),
    easing: { sharp: 'sharp-ease' },
    duration: { enteringScreen: 111, leavingScreen: 222 },
  },
  spacing: jest.fn((value: number) => `${value * 8}px`),
  breakpoints: {
    up: jest.fn(() => 'up-sm'),
  },
};

jest.mock('@mui/material/Drawer', () => (props: any) => (
  <div data-testid="mui-drawer" {...props} />
));

jest.mock('@mui/material/styles', () => ({
  styled: (_Base: any, opts: any) => (styleFn: any) => (props: any) => {
    capturedOptions = opts;
    styleCalls.push(styleFn({ ...props, theme }));
    return <div data-testid="styled-drawer" {...props} />;
  },
}));

import Drawer from '../../../../src/features/dashboard/components/Drawer';

describe('features/dashboard/components/Drawer.tsx', () => {
  it('applies opened styles when open is true', () => {
    render(<Drawer open />);

    const latest = styleCalls.at(-1) || {};
    expect(screen.getByTestId('styled-drawer')).toBeInTheDocument();
    expect(latest.width).toBe(240);
    expect(latest['& .MuiDrawer-paper'].width).toBe(240);
    expect(theme.transitions.create).toHaveBeenCalled();
  });

  it('applies closed styles when open is false', () => {
    render(<Drawer open={false} />);

    const latest = styleCalls.at(-1) || {};
    expect(latest['& .MuiDrawer-paper'].width).toBe('calc(56px + 1px)');
    expect(latest['& .MuiDrawer-paper']['up-sm'].width).toBe(
      'calc(64px + 1px)',
    );
  });

  it('filters open prop using shouldForwardProp', () => {
    render(<Drawer open={false} />);

    expect(capturedOptions.shouldForwardProp('open')).toBe(false);
    expect(capturedOptions.shouldForwardProp('id')).toBe(true);
  });
});
