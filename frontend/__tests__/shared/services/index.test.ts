describe('shared/services/index.ts', () => {
  it('module loads', async () => {
    await expect(import('@/shared/services/index')).resolves.toBeDefined();
  });
});
