import React from 'react';

const optionsSeen: any[] = [];
const styleFns: Array<(p: any) => any> = [];

jest.mock('@mui/material/styles', () => ({
  styled: (_Comp: any, options?: any) => (styleArg: any) => {
    optionsSeen.push(options);
    if (typeof styleArg === 'function') {
      styleFns.push(styleArg);
      styleArg({});
    }
    return (_props: any) => React.createElement('div', null);
  },
}));

jest.mock('@mui/material/Box', () => ({
  __esModule: true,
  default: (_props: any) => React.createElement('div', null),
}));

import * as Styles from '../../../../../../src/features/cron/components/CronJobTableColumns/Columns.styles';

describe('features/cron/components/CronJobTableColumns/Columns.styles.ts', () => {
  it('exports styled symbols', () => {
    expect(Styles.HeaderWrapper).toBeDefined();
    expect(Styles.HeaderTitle).toBeDefined();
    expect(Styles.CellText).toBeDefined();
    expect(Styles.ActionsContainer).toBeDefined();
    expect(Styles.ActionIcon).toBeDefined();
    expect(Styles.ViewIconStyle).toBeDefined();
    expect(Styles.EditIconStyle).toBeDefined();
    expect(Styles.ExportIconStyle).toBeDefined();
    expect(Styles.DateContainer).toBeDefined();
    expect(Styles.DateIcon).toBeDefined();
  });

  it('evaluates style callbacks including hover paths', () => {
    const resolvedStyles = styleFns.map((fn) => fn({}));
    const editStyle = resolvedStyles.find((s: any) => s?.color === '#ed6c02');
    const exportStyle = resolvedStyles.find((s: any) => s?.color === '#0097a7');

    expect(editStyle).toBeDefined();
    expect(editStyle['&:hover'].color).toBe('#e65100');
    expect(exportStyle).toBeDefined();
    expect(exportStyle['&:hover'].color).toBe('#00838f');
    expect(optionsSeen.length).toBeGreaterThan(0);
  });
});
