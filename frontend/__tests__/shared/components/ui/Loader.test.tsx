import React from 'react';
import { render, screen } from '@testing-library/react';
import Loader from '../../../../../src/shared/components/ui/Loader';

describe('Loader', () => {
  it('renders the processing text', () => {
    render(<Loader />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('renders the spinner element', () => {
    const { container } = render(<Loader />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders a fixed overlay wrapper', () => {
    const { container } = render(<Loader />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('fixed');
    expect(wrapper.className).toContain('inset-0');
  });
});
