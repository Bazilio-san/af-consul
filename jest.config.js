module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
  ],
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  testRegex: [
    '.+\\.test\\.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/api/',
    '/config/',
    '/_misc/',
    '/_tmp/',
    '/i18n/',
    '/.idea/',
  ],
  globals: { 'ts-jest': { tsconfig: 'tsconfig.json' } },
};
