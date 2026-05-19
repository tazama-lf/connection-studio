/** @type {import('jest').Config} */

const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  roots: ['<rootDir>/__tests__', '<rootDir>/src'],

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  testMatch: ['<rootDir>/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        diagnostics: false,
        isolatedModules: true,
      },
    ],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/vite-env.d.ts',
    '!src/**/types/**',
    '!src/**/types.ts',
    '!src/**/constants/**',
    '!src/**/constants.ts',
    '!src/**/*.d.ts',
    '!src/**/environment.config.{ts,tsx}',
    '!src/shared/config/environment.config.ts'
  ],

  coverageDirectory: 'coverage',

  coverageReporters: ['text', 'lcov', 'html'],

  coveragePathIgnorePatterns: [
    '[\\\\/]__tests__[\\\\/]',
    '\\.(test|spec)\\.(ts|tsx|js|jsx)$',
    'src/shared/config/environment\\.config\\.ts$'
  ],

  moduleNameMapper: {
    // Heavy dependency mocks (prevent OOM)
    '^react-json-view$': '<rootDir>/__mocks__/react-json-view.tsx',
    '^@mui/material$': '<rootDir>/__mocks__/@mui/material.tsx',
    '^@mui/material/styles$': '<rootDir>/__mocks__/@mui/material/styles.tsx',
    '^@mui/material/(.*)$': '<rootDir>/__mocks__/@mui/material.tsx',

    // Alias imports
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@shared$': '<rootDir>/src/shared/index.ts',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@/(.*)$': '<rootDir>/src/$1',

    // Relative imports with explicit src/ — handles any number of ../
    '^(?:\\.\\./)+src/(.*)$': '<rootDir>/src/$1',

    // Relative imports escaping __tests__ (without src/ prefix)
    '^(?:\\.\\./){3,}features/(.*)$': '<rootDir>/src/features/$1',
    '^(?:\\.\\./){3,}shared/(.*)$': '<rootDir>/src/shared/$1',
    '^(?:\\.\\./){3,}utils/(.*)$': '<rootDir>/src/utils/$1',
    '^(?:\\.\\./){3,}common/(.*)$': '<rootDir>/src/common/$1',

    // Static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif)$': 'jest-transform-stub',
  },

  workerIdleMemoryLimit: '512MB',

  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],

  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
  },
};

module.exports = config;
