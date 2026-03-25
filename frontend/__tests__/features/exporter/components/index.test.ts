import {
  ExporterConfigList,
  ExporterJobList,
  ConfigDetailsModal,
  ExportedItemsList,
  ExportedItemDetailsModal,
  ExporterConfigListDefault,
  ExporterJobListDefault,
  ConfigDetailsModalDefault,
  ExportedItemsListDefault,
  ExportedItemDetailsModalDefault,
} from '../../../../src/features/exporter/components';

describe('features/exporter/components/index.ts', () => {
  it('exports ExporterConfigList as named export', () => {
    expect(ExporterConfigList).toBeDefined();
    expect(typeof ExporterConfigList).toBe('function');
  });

  it('exports ExporterJobList as named export', () => {
    expect(ExporterJobList).toBeDefined();
    expect(typeof ExporterJobList).toBe('function');
  });

  it('exports ConfigDetailsModal as named export', () => {
    expect(ConfigDetailsModal).toBeDefined();
    expect(typeof ConfigDetailsModal).toBe('function');
  });

  it('exports ExportedItemsList as named export', () => {
    expect(ExportedItemsList).toBeDefined();
    expect(typeof ExportedItemsList).toBe('function');
  });

  it('exports ExportedItemDetailsModal as named export', () => {
    expect(ExportedItemDetailsModal).toBeDefined();
    expect(typeof ExportedItemDetailsModal).toBe('function');
  });

  it('exports ExporterConfigListDefault as default export', () => {
    expect(ExporterConfigListDefault).toBeDefined();
    expect(ExporterConfigListDefault).toBe(ExporterConfigList);
  });

  it('exports ExporterJobListDefault as default export', () => {
    expect(ExporterJobListDefault).toBeDefined();
    expect(ExporterJobListDefault).toBe(ExporterJobList);
  });

  it('exports ConfigDetailsModalDefault as default export', () => {
    expect(ConfigDetailsModalDefault).toBeDefined();
    expect(ConfigDetailsModalDefault).toBe(ConfigDetailsModal);
  });

  it('exports ExportedItemsListDefault as default export', () => {
    expect(ExportedItemsListDefault).toBeDefined();
    expect(ExportedItemsListDefault).toBe(ExportedItemsList);
  });

  it('exports ExportedItemDetailsModalDefault as default export', () => {
    expect(ExportedItemDetailsModalDefault).toBeDefined();
    expect(ExportedItemDetailsModalDefault).toBe(ExportedItemDetailsModal);
  });
});


