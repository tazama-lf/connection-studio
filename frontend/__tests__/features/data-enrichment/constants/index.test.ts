describe('features/data-enrichment/constants/index.ts', () => {
  it('module loads', async () => {
    await expect(
      import('@/features/data-enrichment/constants/index'),
    ).resolves.toBeDefined();
  });
});
