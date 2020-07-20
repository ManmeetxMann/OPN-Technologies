module.exports = {
  parser: '@typescript-eslint/parser', // Specifies ESLint parser
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended',
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2019, // Allows parsing of modern ECMA features
    sourceType: 'module', // Allows for the use of imports
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 2,
    '@typescript-eslint/no-unused-vars': ['error', { 'ignoreRestSiblings': true }]
  },
}
