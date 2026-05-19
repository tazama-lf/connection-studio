import { describe, expect, it, beforeEach, jest } from '@jest/globals';

const renderMock = jest.fn();
const createRootMock = jest.fn(() => ({
  render: renderMock,
}));

jest.mock('react-dom/client', () => ({
  createRoot: (...args: unknown[]) => createRootMock(...args),
}));

jest.mock('../src/App.tsx', () => ({
  __esModule: true,
  default: () => null,
}));

describe('main.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('boots React app using createRoot and render', () => {
    jest.isolateModules(() => {
      require('../src/main.tsx');
    });

    expect(createRootMock).toHaveBeenCalledWith(
      document.getElementById('root'),
    );
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});
