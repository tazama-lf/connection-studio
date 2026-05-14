describe('features/functions/services/index.ts', () => {
  it('module loads', async () => {
    await expect(
      import('@/features/functions/services/index'),
    ).resolves.toBeDefined();
  });
});
