import React from 'react';
import { render, screen } from '@testing-library/react';
import ValidationError from '../../../../src/shared/components/ValidationError';

describe('ValidationError', () => {
  it('renders the error message', () => {
    render(<ValidationError message="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('renders different error messages', () => {
    render(<ValidationError message="Invalid email format" />);
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('renders an empty message without crashing', () => {
    render(<ValidationError message="" />);
    // Should not throw
  });
});
