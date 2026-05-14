import React from 'react';

const styleCalls: any[] = [];
const styledOptions: any[] = [];
const styleFns: any[] = [];

jest.mock('@mui/material/styles', () => ({
  styled: (_Comp: any, options?: any) => (styleFn: any) => {
    styledOptions.push(options);
    styleFns.push(styleFn);
    styleCalls.push(
      styleFn({ theme: { spacing: (v: number) => `${v * 8}px` } }),
    );
    return (_props: any) => React.createElement('div', null);
  },
}));

jest.mock('@mui/material/Box', () => ({
  __esModule: true,
  default: (_props: any) => React.createElement('div', null),
}));
jest.mock('@mui/x-data-grid', () => ({
  DataGrid: (_props: any) => React.createElement('div', null),
}));

import {
  TableOuter,
  TableWrapper,
  StyledDataGrid,
  PaginationContainer,
  PaginationText,
  PaginationBold,
} from '../../../../src/common/Tables/CustomTable/Table.styles';

describe('common/Tables/CustomTable/Table.styles.ts', () => {
  it('loads styled exports and evaluates styled callbacks', () => {
    expect(TableOuter).toBeDefined();
    expect(TableWrapper).toBeDefined();
    expect(StyledDataGrid).toBeDefined();
    expect(PaginationContainer).toBeDefined();
    expect(PaginationText).toBeDefined();
    expect(PaginationBold).toBeDefined();
  });

  it('covers shouldForwardProp and conditional style objects', () => {
    const dataGridOptions = styledOptions.find(
      (opt) => opt && opt.shouldForwardProp,
    );
    expect(dataGridOptions).toBeDefined();
    expect(dataGridOptions.shouldForwardProp('multilineHeader')).toBe(false);
    expect(dataGridOptions.shouldForwardProp('horizontalScroll')).toBe(false);
    expect(dataGridOptions.shouldForwardProp('id')).toBe(true);

    const styleFn = styleFns[2];
    expect(styleFn).toBeDefined();

    const multiline = styleFn({
      multilineHeader: true,
      horizontalScroll: false,
      horizontalScrollTextAlign: 'left',
    });
    const horizontal = styleFn({
      multilineHeader: false,
      horizontalScroll: true,
      horizontalScrollTextAlign: 'right',
    });

    expect(multiline).toBeDefined();
    expect(horizontal).toBeDefined();
  });
});
