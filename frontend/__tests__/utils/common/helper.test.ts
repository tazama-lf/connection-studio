describe('utils/common/helper.ts', () => {
  it('module loads', async () => {
    await expect(import('@/utils/common/helper')).resolves.toBeDefined();
  });
});

