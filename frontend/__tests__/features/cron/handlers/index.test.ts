describe('features/cron/handlers/index.ts', () => {
  it('module loads', async () => {
    await expect(
      import('@/features/cron/handlers/index'),
    ).resolves.toBeDefined();
  });
});
