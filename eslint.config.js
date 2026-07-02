import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tsParser from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const sharedExtends = [
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
]

const sharedSettings = { react: { version: 'detect' } }

const sharedRules = {
  'react/prop-types': 'off',
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
}

export default defineConfig([
  globalIgnores(['dist', 'legacy_backup']),
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    extends: [js.configs.recommended, ...sharedExtends],
    settings: sharedSettings,
    rules: {
      ...sharedRules,
      'no-unused-vars': ['error', {
        'vars': 'all',
        'args': 'after-used',
        'ignoreRestSiblings': false,
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_',
      }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser.parser,
      globals: { ...globals.browser, ...globals.node },
    },
    extends: [...tsParser.configs.recommended, ...sharedExtends],
    settings: sharedSettings,
    rules: {
      ...sharedRules,
      '@typescript-eslint/no-unused-vars': ['error', {
        'args': 'after-used',
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_',
      }],
    },
  },
])
