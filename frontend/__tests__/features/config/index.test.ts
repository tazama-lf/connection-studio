jest.mock('../../../src/features/config/services/configApi', () => ({
  __esModule: true,
  getConfigs: jest.fn(),
}));

jest.mock('../../../src/features/config/components', () => ({
  __esModule: true,
  ConfigList: () => null,
}));

describe('features/config/index.ts', () => {
  it('re-exports service and component modules', async () => {
    const mod = await import('../../../src/features/config');

    expect(mod.getConfigs).toBeDefined();
    expect(mod.ConfigList).toBeDefined();
  });
});
