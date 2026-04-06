import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeOptionalUrl,
  normalizeString,
  normalizeStringArray,
  parsePaginationNumber,
} from '../src/api/validation.js';

test('normalizeString trims non-empty strings', () => {
  assert.equal(normalizeString('  hello  '), 'hello');
  assert.equal(normalizeString('   '), null);
  assert.equal(normalizeString(42), null);
});

test('normalizeStringArray trims, deduplicates, and rejects invalid entries', () => {
  assert.deepEqual(
    normalizeStringArray([' Alpha ', 'Beta', 'Alpha', ''], 'Authors'),
    ['Alpha', 'Beta']
  );

  assert.throws(
    () => normalizeStringArray(['Alpha', 42], 'Authors'),
    /Authors must be an array of strings/
  );
});

test('normalizeOptionalUrl accepts http and https only', () => {
  assert.equal(
    normalizeOptionalUrl('https://example.com/book', 'Goodreads link'),
    'https://example.com/book'
  );
  assert.equal(normalizeOptionalUrl('   ', 'Goodreads link'), null);
  assert.equal(normalizeOptionalUrl(undefined, 'Goodreads link'), undefined);

  assert.throws(
    () => normalizeOptionalUrl('ftp://example.com/book', 'Goodreads link'),
    /Goodreads link must be a valid URL/
  );
});

test('parsePaginationNumber enforces integer bounds', () => {
  assert.equal(parsePaginationNumber(undefined, 20, { min: 1, max: 100 }), 20);
  assert.equal(parsePaginationNumber('10', 20, { min: 1, max: 100 }), 10);

  assert.throws(
    () => parsePaginationNumber('0', 20, { min: 1, max: 100 }),
    /Value must be an integer between 1 and 100/
  );
});
