const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
  skipEnvValidation: true,
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transformIgnorePatterns: [
    'node_modules/(?!(nanoid|@clerk)/)',
  ],
  testSequencer: require.resolve('@jest/test-sequencer'),
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
  ],
};

module.exports = createJestConfig(customJestConfig);
