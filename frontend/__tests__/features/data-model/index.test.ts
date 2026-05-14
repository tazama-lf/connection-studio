import * as dataModelIndex from '@/features/data-model';
import { dataModelApi } from '@/features/data-model/services/dataModelApi';
import { ExtensionManagement } from '@/features/data-model/components/ExtensionManagement';

describe('features/data-model/index.ts', () => {
  it('re-exports runtime members from feature module', () => {
    expect(dataModelIndex.dataModelApi).toBe(dataModelApi);
    expect(dataModelIndex.ExtensionManagement).toBe(ExtensionManagement);
  });
});
