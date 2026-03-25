jest.mock('../../../../src/features/dashboard/Dashboard', () => ({
  __esModule: true,
  default: 'DashboardStub',
}));

describe('features/dashboard/pages/Dashboard.tsx', () => {
  it('re-exports dashboard page default from parent module', async () => {
    const pageMod = await import('../../../../src/features/dashboard/pages/Dashboard');

    expect(pageMod.default).toBe('DashboardStub');
  });
});