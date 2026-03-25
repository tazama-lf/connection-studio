import * as functionsFeature from '../../../src/features/functions';
import * as services from '../../../src/features/functions/services';

describe('features/functions index exports', () => {
  it('re-exports service functions', () => {
    expect(functionsFeature.addFunction).toBe(services.addFunction);
    expect(functionsFeature.updateFunction).toBe(services.updateFunction);
    expect(functionsFeature.deleteFunction).toBe(services.deleteFunction);
    expect(functionsFeature.getConfigWithFunctions).toBe(services.getConfigWithFunctions);
  });
});
