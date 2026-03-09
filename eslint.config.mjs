import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': hooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'max-len': ['error', { code: 100, ignoreStrings: true, ignoreTemplateLiterals: true }],
      complexity: 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react/no-children-prop': 'off',
      'react/no-unescaped-entities': 'off',
      'react/no-danger': 'off',
      'react/jsx-no-useless-fragment': 'off',
      'react/jsx-no-bind': 'off',
      'react/jsx-key': 'off',
      'react/no-is-mounted': 'off',
      'no-inline-comments': 'off',
    },
  },
  prettierConfig,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '*.js', 'eslint.config.js'],
  },
);
