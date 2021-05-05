module.exports = {
  parser: '@typescript-eslint/parser', // Specifies ESLint parser
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:promise/recommended',
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2019, // Allows parsing of modern ECMA features
    sourceType: 'module', // Allows for the use of imports
    project: './tsconfig.json',
  },
  rules: {
    'max-params': ['error', {max: 3}],
    'max-lines': ['error', {max: 450, skipBlankLines: true, skipComments: true}],
    'max-lines-per-function': ['error', {max: 120, skipBlankLines: true, skipComments: true}],
    complexity: ['error', 20], // cyclomatic complexity
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {argsIgnorePattern: '^_', ignoreRestSiblings: true},
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    // Use OpnConfigService from '@opn-services/common/services'
    'no-restricted-imports': ['error', '@nestjs/config'],
  },
  root: true,
}
