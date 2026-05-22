describe('utils/common/functions.ts', () => {
  it('module loads', async () => {
    await expect(import('@/utils/common/functions')).resolves.toBeDefined();
  });
});
