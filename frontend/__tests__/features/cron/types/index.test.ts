describe('features/cron/types/index.ts', () => {
  it('module loads', async () => {
    await expect(import('@/features/cron/types/index')).resolves.toBeDefined();
  });
});

