import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  handleInputFilter,
  handleSelectFilter,
} from '../../../src/shared/helpers/index';

// ─── handleInputFilter ────────────────────────────────────────────────────────

const InputFilterWrapper: React.FC<{
  fieldName?: string;
  searchingFilters?: Record<string, any>;
  setPage?: jest.Mock;
}> = ({ fieldName = 'name', searchingFilters = {}, setPage }) => {
  const [filters, setFilters] = useState<Record<string, any>>(searchingFilters);

  return (
    <div>
      {handleInputFilter({
        fieldName,
        searchingFilters: filters,
        setSearchingFilters: setFilters,
        setPage,
      })}
      <span data-testid="filter-value">{JSON.stringify(filters)}</span>
    </div>
  );
};

describe('handleInputFilter', () => {
  it('renders an input element with search placeholder', () => {
    render(<InputFilterWrapper />);
    expect(screen.getByPlaceholderText('search...')).toBeInTheDocument();
  });

  it('pre-fills input from searchingFilters', () => {
    render(<InputFilterWrapper searchingFilters={{ name: 'existing' }} />);
    const input = screen.getByPlaceholderText('search...') as HTMLInputElement;
    expect(input.value).toBe('existing');
  });

  it('updates local value on change', () => {
    render(<InputFilterWrapper />);
    const input = screen.getByPlaceholderText('search...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(input.value).toBe('abc');
  });

  it('clears the filter when input is emptied', () => {
    render(<InputFilterWrapper searchingFilters={{ name: 'abc' }} />);
    const input = screen.getByPlaceholderText('search...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    const filterValue = screen.getByTestId('filter-value').textContent ?? '';
    const parsed = JSON.parse(filterValue);
    expect(parsed.name).toBeUndefined();
  });

  it('calls setPage(1) when cleared', () => {
    const setPage = jest.fn();
    render(
      <InputFilterWrapper
        searchingFilters={{ name: 'abc' }}
        setPage={setPage}
      />,
    );
    const input = screen.getByPlaceholderText('search...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it('updates filter on Enter key press', () => {
    render(<InputFilterWrapper />);
    const input = screen.getByPlaceholderText('search...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'testValue' } });
    fireEvent.keyDown(input, { key: 'Enter', target: { value: 'testValue' } });
    const filterValue = screen.getByTestId('filter-value').textContent ?? '';
    const parsed = JSON.parse(filterValue);
    expect(parsed.name).toBe('testValue');
  });

  it('does not update filter when a non-Enter key is pressed', () => {
    render(<InputFilterWrapper />);
    const input = screen.getByPlaceholderText('search...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'typed' } });
    fireEvent.keyDown(input, { key: 'Escape', target: { value: 'typed' } });

    const filterValue = screen.getByTestId('filter-value').textContent ?? '';
    expect(JSON.parse(filterValue)).toEqual({});
  });

  it('calls setPage(1) on Enter key', () => {
    const setPage = jest.fn();
    render(<InputFilterWrapper setPage={setPage} />);
    const input = screen.getByPlaceholderText('search...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter', target: { value: 'hello' } });
    expect(setPage).toHaveBeenCalledWith(1);
  });
});

// ─── handleSelectFilter ───────────────────────────────────────────────────────

const options = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const SelectFilterWrapper: React.FC<{
  fieldName?: string;
  searchingFilters?: Record<string, any>;
  setPage?: jest.Mock;
}> = ({ fieldName = 'status', searchingFilters = {}, setPage }) => {
  const [filters, setFilters] = useState<Record<string, any>>(searchingFilters);

  return (
    <div>
      {handleSelectFilter({
        fieldName,
        options,
        searchingFilters: filters,
        setSearchingFilters: setFilters,
        setPage,
      })}
      <span data-testid="filter-value">{JSON.stringify(filters)}</span>
    </div>
  );
};

describe('handleSelectFilter', () => {
  it('renders a select element with Show All option', () => {
    render(<SelectFilterWrapper />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Show All')).toBeInTheDocument();
  });

  it('renders the provided options', () => {
    render(<SelectFilterWrapper />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('sets filter value when an option is selected', () => {
    render(<SelectFilterWrapper />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'active' } });
    const filterValue = screen.getByTestId('filter-value').textContent ?? '';
    const parsed = JSON.parse(filterValue);
    expect(parsed.status).toBe('active');
  });

  it('removes filter when "Show All" (empty value) is selected', () => {
    render(<SelectFilterWrapper searchingFilters={{ status: 'active' }} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '' } });
    const filterValue = screen.getByTestId('filter-value').textContent ?? '';
    const parsed = JSON.parse(filterValue);
    expect(parsed.status).toBeUndefined();
  });

  it('calls setPage(1) when a value is selected', () => {
    const setPage = jest.fn();
    render(<SelectFilterWrapper setPage={setPage} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'inactive' } });
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it('calls setPage(1) when Show All is selected', () => {
    const setPage = jest.fn();
    render(
      <SelectFilterWrapper
        setPage={setPage}
        searchingFilters={{ status: 'active' }}
      />,
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '' } });
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it('pre-selects value from searchingFilters', () => {
    render(<SelectFilterWrapper searchingFilters={{ status: 'inactive' }} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('inactive');
  });
});
