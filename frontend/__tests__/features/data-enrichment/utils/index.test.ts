describe('features/data-enrichment/utils/index.ts', () => {
  it('module loads', async () => {
    await expect(import('@/features/data-enrichment/utils/index')).resolves.toBeDefined();
  });
});

