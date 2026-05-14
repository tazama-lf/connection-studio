describe('utils/common/apiHelper.ts', () => {
  it('module loads', async () => {
    await expect(import('@/utils/common/apiHelper')).resolves.toBeDefined();
  });
});
