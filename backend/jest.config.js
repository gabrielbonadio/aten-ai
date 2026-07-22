const { createDefaultPreset } = require('ts-jest');

/** @type {import('jest').Config} */
module.exports = {
  ...createDefaultPreset(),
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/jest.setup.ts'],
  clearMocks: true,
  restoreMocks: true,
  moduleFileExtensions: ['ts', 'js', 'json']
};
