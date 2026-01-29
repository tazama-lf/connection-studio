module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        baseUrl: 'src',
        paths: {
          '@*': ['*'],
          '@features/*': ['features/*'],
          '@shared/*': ['shared/*'],
          '@utils/*': ['utils/*'],
          '@common/*': ['common/*'],
        }
      }
    }],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/test/**',
    '!src/shared/config/environment.config.ts',
    '!src/**/types/**',
    '!src/**/constants/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif)$': 'jest-transform-stub'
  },
 testPathIgnorePatterns: [
  '<rootDir>/node_modules/',
  '<rootDir>/dist/',
  '/constants/',
  '/types/',
],

  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
};
