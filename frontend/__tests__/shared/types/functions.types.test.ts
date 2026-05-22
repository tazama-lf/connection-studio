describe('shared/types/functions.types.ts', () => {
  it('module loads', async () => {
    await expect(
      import('@/shared/types/functions.types'),
    ).resolves.toBeDefined();
  });
});
