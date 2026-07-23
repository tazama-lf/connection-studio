import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { Search } from '../../../../src/common/Tables/Search';

jest.mock('@mui/x-data-grid', () => ({
  GridToolbarQuickFilter: () => <div data-testid="quick-filter" />,
}));

describe('common/Tables/Search/index.tsx', () => {
  it('renders quick filter toolbar', () => {
    render(<Search />);

    expect(screen.getByTestId('quick-filter')).toBeInTheDocument();
  });
});
