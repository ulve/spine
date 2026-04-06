import test from 'node:test';
import assert from 'node:assert/strict';
import { getRequiredEnv } from '../src/config.js';

test('getRequiredEnv returns configured values', () => {
  process.env.TEST_CONFIG_VALUE = 'configured';
  assert.equal(getRequiredEnv('TEST_CONFIG_VALUE'), 'configured');
});

test('getRequiredEnv throws when the value is missing', () => {
  delete process.env.TEST_CONFIG_MISSING;
  assert.throws(() => getRequiredEnv('TEST_CONFIG_MISSING'), /TEST_CONFIG_MISSING must be set/);
});
