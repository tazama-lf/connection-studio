import React from 'react';
import { render, screen } from '@testing-library/react';

const styleCalls: Array<Record<string, unknown>> = [];
let capturedOptions: any;

jest.mock('@mui/material/ListItemButton', () => (props: any) => <button data-testid="list-item" {...props} />);

jest.mock('@mui/material/styles', () => ({
  styled:
    (_Base: any, opts: any) =>
    (styleFn: any) =>
    (props: any) => {
      capturedOptions = opts;
      styleCalls.push(styleFn(props));
      return <button data-testid="nav-item" {...props} />;
    },
}));

import NavListItemButton from '../../../../src/features/dashboard/components/NavListItemButton';

describe('features/dashboard/components/NavListItemButton.tsx', () => {
  it('applies open=true style path', () => {
    render(<NavListItemButton open />);
    expect(screen.getByTestId('nav-item')).toBeInTheDocument();
    expect(styleCalls.at(-1)?.justifyContent).toBe('initial');
  });

  it('applies open=false style path', () => {
    render(<NavListItemButton open={false} />);
    expect(styleCalls.at(-1)?.justifyContent).toBe('center');
  });

  it('filters open prop via shouldForwardProp', () => {
    render(<NavListItemButton open={false} />);

    expect(capturedOptions.shouldForwardProp('open')).toBe(false);
    expect(capturedOptions.shouldForwardProp('id')).toBe(true);
  });
});