module.exports = {
  root: true,
  extends: [
    'eslint-config-af-22',
  ],
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  globals: {},
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    // ecmaVersion: 13,
  },
  plugins: ['prefer-arrow', 'import', '@typescript-eslint'],
  ignorePatterns: ['node_modules/', '**/*.json', '**/dist/**/*.*'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    'consistent-return': 'off',
    'default-case': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'max-len': ['warn', 200],
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'no-underscore-dangle': 'off',
    'no-unused-vars': 'off',
    'object-curly-newline': [
      'error',
      {
        ObjectExpression: { multiline: true, minProperties: 8 },
        ObjectPattern: { multiline: true, minProperties: 8 },
        ImportDeclaration: { multiline: true, minProperties: 8 },
        ExportDeclaration: { multiline: true, minProperties: 8 },
      },
    ],
  },
};
