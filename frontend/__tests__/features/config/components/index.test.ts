jest.mock('../../../../src/features/config/components/ConfigList', () => ({
  __esModule: true,
  ConfigList: () => null,
  default: () => null,
}));

jest.mock('../../../../src/features/config/components/ConfigDetails', () => ({
  __esModule: true,
  ConfigDetails: () => null,
  default: () => null,
}));

jest.mock(
  '../../../../src/features/config/components/VersionHistoryModal',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

describe('features/config/components/index.ts', () => {
  it('re-exports all configured component symbols', async () => {
    const mod = await import('../../../../src/features/config/components');

    expect(mod.ConfigList).toBeDefined();
    expect(mod.ConfigDetails).toBeDefined();
    expect(mod.VersionHistoryModal).toBeDefined();
    expect(mod.ConfigListDefault).toBeDefined();
    expect(mod.ConfigDetailsDefault).toBeDefined();
  });
});
