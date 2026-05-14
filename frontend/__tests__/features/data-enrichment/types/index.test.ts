describe('features/data-enrichment/types/index.ts', () => {
  it('module loads', async () => {
    await expect(
      import('@/features/data-enrichment/types/index'),
    ).resolves.toBeDefined();
  });
});
