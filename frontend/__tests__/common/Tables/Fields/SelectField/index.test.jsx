import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SelectField from '../../../../../src/common/Tables/Fields/SelectField';

jest.mock('@mui/material', () => ({
  Select: ({ value, onChange, children, renderValue, disabled }) => (
    <div>
      <div data-testid="render-value">{renderValue(value)}</div>
      <button
        data-testid="change-value"
        disabled={disabled}
        onClick={() => onChange({ target: { value: 'b' } })}
      >
        change
      </button>
      <div data-testid="options">{children}</div>
    </div>
  ),
  MenuItem: ({ children, value }) => <div data-testid={`option-${value}`}>{children}</div>,
}));

describe('SelectField', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];

  it('shows placeholder when no selected value', () => {
    render(
      <SelectField
        color="#000"
        value=""
        handleChange={() => {}}
        options={options}
        disabled={false}
        placeholder="Pick one"
      />,
    );

    expect(screen.getByText('Pick one')).toBeInTheDocument();
    expect(screen.getByTestId('option-a')).toBeInTheDocument();
    expect(screen.getByTestId('option-b')).toBeInTheDocument();
  });

  it('shows selected label and triggers onChange', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <SelectField
        color="#000"
        value="a"
        handleChange={handleChange}
        options={options}
        disabled={false}
      />,
    );

    expect(screen.getByTestId('render-value')).toHaveTextContent('Option A');
    await user.click(screen.getByTestId('change-value'));
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders empty label when selected option is not found', () => {
    render(
      <SelectField
        color="#000"
        value="missing"
        handleChange={() => {}}
        options={options}
        disabled={false}
      />,
    );

    expect(screen.getByTestId('render-value')).toHaveTextContent('');
  });
});
