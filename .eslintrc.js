module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: [
    'plugin:vue/essential',
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 13,
  },
  plugins: [
    'vue',
  ],
  rules: {
    'no-param-reassign': 'off',
    'max-len': ['warn', 200],
    'no-underscore-dangle': 'off',
    'consistent-return': 'off',
  },
};
