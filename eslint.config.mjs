import js from '@eslint/js';
import { customRules } from './custom-rules.js';

/**
 * A minimal shared ESLint configuration with custom rules.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  js.configs.recommended,
  {
    plugins: {
      'custom-rules': customRules,
    },
    rules: {
      'custom-rules/max-file-lines': 'warn',
    },
  },
];