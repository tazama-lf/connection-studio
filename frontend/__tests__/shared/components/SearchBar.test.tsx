import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '../../../src/shared/components/SearchBar';

describe('SearchBar', () => {
  it('renders with the provided searchTerm value', () => {
    render(<SearchBar searchTerm="hello" setSearchTerm={jest.fn()} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('hello');
  });

  it('renders default placeholder when none provided', () => {
    render(<SearchBar searchTerm="" setSearchTerm={jest.fn()} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders a custom placeholder', () => {
    render(<SearchBar searchTerm="" setSearchTerm={jest.fn()} placeholder="Find items..." />);
    expect(screen.getByPlaceholderText('Find items...')).toBeInTheDocument();
  });

  it('calls setSearchTerm when user types', () => {
    const setSearchTerm = jest.fn();
    render(<SearchBar searchTerm="" setSearchTerm={setSearchTerm} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abc' } });

    expect(setSearchTerm).toHaveBeenCalledWith('abc');
  });

  it('renders an input element', () => {
    render(<SearchBar searchTerm="test" setSearchTerm={jest.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
