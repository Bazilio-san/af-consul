module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: [
    'airbnb-base',
  ],
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['prefer-arrow', 'import', '@typescript-eslint'],
  parserOptions: {
    sourceType: 'module',
    // ecmaVersion: 13,
  },
  ignorePatterns: ['node_modules/', '**/*.json', '**/dist/**/*.*'],
  rules: {
    'no-param-reassign': 'off',
    'max-len': ['warn', 200],
    'no-underscore-dangle': 'off',
    'consistent-return': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'object-curly-newline': [
      'error',
      {
        ObjectExpression: { multiline: true, minProperties: 3 },
        ObjectPattern: { multiline: true },
        ImportDeclaration: 'never',
        ExportDeclaration: { multiline: true, minProperties: 3 },
      },
    ],
  },
};
