'use strict';

process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = '';

process.on('unhandledRejection', (err) => {
  throw err;
});

require('react-scripts/config/env');

const fs = require('fs');
const path = require('path');
const jest = require('jest');
const resolve = require('resolve');
const createJestConfig = require('react-scripts/scripts/utils/createJestConfig');

const rawArgs = process.argv.slice(2);
let testType = 'all';
const passthroughArgs = [];

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg.startsWith('--type=')) {
    testType = arg.slice('--type='.length);
  } else if (arg === '--type' && rawArgs[i + 1]) {
    testType = rawArgs[i + 1];
    i += 1;
  } else {
    passthroughArgs.push(arg);
  }
}

const isWatchMode =
  passthroughArgs.includes('--watch') || passthroughArgs.includes('--watchAll');

if (!isWatchMode && !passthroughArgs.includes('--watchAll=false')) {
  passthroughArgs.push('--watchAll=false');
}

const projectRoot = path.resolve(__dirname, '..');
const baseConfig = createJestConfig(
  (relativePath) => path.resolve(path.dirname(require.resolve('react-scripts/package.json')), relativePath),
  projectRoot,
  false,
);

const testMatchByType = {
  unit: ['<rootDir>/test/**/*.test.ts', '<rootDir>/test/**/*.spec.ts'],
  component: ['<rootDir>/test/**/*.test.tsx', '<rootDir>/test/**/*.spec.tsx'],
  all: ['<rootDir>/test/**/*.{spec,test}.{ts,tsx,js,jsx}'],
};

if (!testMatchByType[testType]) {
  console.error(`Tipo de teste inválido: "${testType}". Use: unit, component ou all.`);
  process.exit(1);
}

const setupTestsPath = path.join(projectRoot, 'test', 'setupTests.ts');
const jestConfig = {
  ...baseConfig,
  roots: ['<rootDir>/test'],
  setupFilesAfterEnv: fs.existsSync(setupTestsPath)
    ? ['<rootDir>/test/setupTests.ts']
    : baseConfig.setupFilesAfterEnv,
  testMatch: testMatchByType[testType],
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/**/*.d.ts'],
};

function resolveJestEnv(name) {
  const jestDir = path.dirname(
    resolve.sync('jest', {
      basedir: path.dirname(require.resolve('react-scripts/package.json')),
    }),
  );
  const jestCLIDir = path.dirname(resolve.sync('jest-cli', { basedir: jestDir }));
  const jestConfigDir = path.dirname(resolve.sync('jest-config', { basedir: jestCLIDir }));
  return resolve.sync(name, { basedir: jestConfigDir });
}

const finalArgs = [...passthroughArgs, '--config', JSON.stringify(jestConfig)];
if (!finalArgs.includes('--env')) {
  finalArgs.push('--env', resolveJestEnv('jest-environment-jsdom'));
}

jest.run(finalArgs);
