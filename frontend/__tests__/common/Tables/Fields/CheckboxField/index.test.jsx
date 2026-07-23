import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CheckboxField from '../../../../../src/common/Tables/Fields/CheckboxField';
import { getThemeLightColor } from 'Utils/menu';

jest.mock('@mui/material', () => ({
  Checkbox: (props) => <input data-testid="checkbox" type="checkbox" {...props} />,
  FormControlLabel: ({ control, label }) => (
    <label>
      {control}
      <span>{label}</span>
    </label>
  ),
}));

jest.mock(
  'Utils/menu',
  () => ({
    getThemeLightColor: jest.fn(() => '#2b7fff'),
  }),
  { virtual: true },
);

describe('CheckboxField', () => {
  it('renders labeled checkbox and handles click', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <CheckboxField
        label="Enable"
        color="primary"
        checked={false}
        handleChange={handleChange}
        disabled={false}
      />,
    );

    expect(screen.getByText('Enable')).toBeInTheDocument();
    await user.click(screen.getByTestId('checkbox'));
    expect(handleChange).toHaveBeenCalled();
    expect(getThemeLightColor).toHaveBeenCalled();
  });

  it('renders unlabeled checkbox variant', () => {
    render(
      <CheckboxField
        color="secondary"
        checked
        handleChange={() => {}}
        disabled
        size={18}
      />,
    );

    expect(screen.getByTestId('checkbox')).toBeInTheDocument();
  });

  it('falls back to passed color when theme color is unavailable', () => {
    getThemeLightColor.mockReturnValueOnce(undefined);

    render(
      <CheckboxField
        color="warning"
        checked={false}
        handleChange={() => {}}
        disabled={false}
      />,
    );

    expect(screen.getByTestId('checkbox')).toHaveAttribute('color', 'warning');
  });
});
