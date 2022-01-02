module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    jest: true,
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
    '@typescript-eslint/no-unused-vars': 'warn',
    'consistent-return': 'off',
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
        ObjectExpression: { multiline: true, minProperties: 3 },
        ObjectPattern: { multiline: true },
        ImportDeclaration: { multiline: true },
        ExportDeclaration: { multiline: true, minProperties: 3 },
      },
    ],
  },
};
