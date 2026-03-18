import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppProviders } from '../../../src/shared/providers/AppProviders';

describe('AppProviders', () => {
  it('renders children without crashing', () => {
    render(
      <AppProviders>
        <div data-testid="child">Hello World</div>
      </AppProviders>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <AppProviders>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </AppProviders>,
    );
    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });
});
