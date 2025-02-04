import typescriptEslint from '@typescript-eslint/eslint-plugin';
import jest from 'eslint-plugin-jest';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['**/dist/', '**/lib/', '**/node_modules/', '**/coverage/'],
  },
  {
    files: ['eslint.config.mjs', '*.js', '*.mjs', '*.cjs'],
    ...js.configs.recommended,
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'module',
      ecmaVersion: 'latest',
    },
    rules: {
      'import/no-unresolved': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['**/*.ts'],
    ...compat.extends(
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:import/recommended',
      'plugin:import/typescript',
      'plugin:jest/recommended',
      'prettier'
    )[0],
    plugins: {
      '@typescript-eslint': typescriptEslint,
      import: importPlugin,
      jest,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      // Imports
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/namespace': 'error',
      'import/default': 'error',
      'import/export': 'error',
      'import/no-unused-modules': 'error',
      'import/no-cycle': 'error',
      'import/no-useless-path-segments': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',

      // General
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-duplicate-imports': 'off',
      'import/no-duplicates': 'error',
      'object-shorthand': 'error',
      camelcase: [
        'error',
        {
          properties: 'never',
          ignoreDestructuring: true,
        },
      ],
      'no-return-await': 'off',
      '@typescript-eslint/return-await': ['error', 'always'],
      'no-throw-literal': 'error',
      'prefer-template': 'error',
      'no-useless-concat': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],
    },
  },
  {
    files: ['**/*.test.ts', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'jest/expect-expect': 'error',
      'jest/no-disabled-tests': 'error',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/valid-expect': 'error',
      'jest/prefer-strict-equal': 'error',
      'jest/no-conditional-expect': 'error',
    },
  },
];
