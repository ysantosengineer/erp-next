module.exports = {
  rootDir: '..',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: 'test/e2e/.*\.e2e-spec\.ts$',
  transform: { '^.+\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setup/e2e-env.ts'],
  globalSetup: '<rootDir>/test/setup/global-setup.cjs',
  maxWorkers: 1,
};
