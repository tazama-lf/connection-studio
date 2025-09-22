import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'build',
    'node_modules',
    'coverage',
    '.vscode',
    '.idea',
    '*.log',
    '*.pid',
    '*.seed',
    '*.pid.lock',
    '*.swp',
    '*.swo',
    '.DS_Store',
    'Thumbs.db',
    '*.tsbuildinfo',
    '.env*',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
