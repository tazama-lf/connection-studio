jest.mock('../../../src/features/dashboard/pages/Dashboard', () => ({
  __esModule: true,
  default: 'DashboardPageStub',
}));

describe('features/dashboard/index.ts', () => {
  it('exports Dashboard symbol', async () => {
    const mod = await import('../../../src/features/dashboard');

    expect(mod.Dashboard).toBe('DashboardPageStub');
  });
});

