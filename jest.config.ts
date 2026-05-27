import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/zoom-webapp/',
    '<rootDir>/public/zoom/',
    '<rootDir>/public/lib/zoom/',
    '<rootDir>/.agent/',
    '<rootDir>/.browser-profile/',
    '<rootDir>/.codex/',
    '<rootDir>/.serena/',
    '<rootDir>/scripts/packager/',
    '<rootDir>/Shaka Packager Script/',
  ],
};

export default createJestConfig(config);
