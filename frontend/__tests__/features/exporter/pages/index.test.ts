jest.mock('../../../../src/features/exporter/pages/ExporterModule', () => ({
  __esModule: true,
  default: 'ExporterModuleMock',
}));

jest.mock('../../../../src/features/exporter/pages/ExporterConfigsPage', () => ({
  __esModule: true,
  default: 'ExporterConfigsPageMock',
}));

jest.mock('../../../../src/features/exporter/pages/ExporterDEJobsPage', () => ({
  __esModule: true,
  default: 'ExporterDEJobsPageMock',
}));

import * as exporterPages from '../../../../src/features/exporter/pages';

describe('features/exporter/pages index exports', () => {
  it('re-exports default page modules', () => {
    expect(exporterPages.ExporterModule).toBe('ExporterModuleMock');
    expect(exporterPages.ExporterConfigsPage).toBe('ExporterConfigsPageMock');
    expect(exporterPages.ExporterDEJobsPage).toBe('ExporterDEJobsPageMock');
  });
});
