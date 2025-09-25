module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  moduleFileExtensions: ['js', 'ts'],
  transform: {
    '^.+\.(ts|js)$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!([^/]*/)*((@scure|@noble|@ethereumjs)))'
  ],
  modulePathIgnorePatterns: ['<rootDir>/tests/__mocks__'],
};
