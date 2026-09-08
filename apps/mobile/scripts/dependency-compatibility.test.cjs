/* global __dirname */
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const queryString = require('query-string');

test('Expo Router query-string keeps Unicode, repeated values and malformed URL handling', () => {
  assert.deepEqual({ ...queryString.parse('name=za%C5%BC%C3%B3%C5%82%C4%87&tag=a&tag=b&space=a+b') }, {
    name: 'zażółć', tag: ['a', 'b'], space: 'a b',
  });
  assert.doesNotThrow(() => queryString.parse('broken=%E0%A4%A'));
  assert.equal(queryString.stringify({ name: 'żółć' }), 'name=%C5%BC%C3%B3%C5%82%C4%87');
});

test('malformed percent-encoded input completes within a bounded child process', () => {
  const result = spawnSync(process.execPath, ['-e',
    "require('query-string').parse('value=' + '%FE%FF'.repeat(10000))"],
  { cwd: require('node:path').resolve(__dirname, '..'), timeout: 5000, encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});

test('xcode still generates valid unique project IDs with the patched UUID dependency', () => {
  const project = require('xcode').project('unused.pbxproj');
  project.hash = { project: { objects: {} } };
  const ids = new Set(Array.from({ length: 100 }, () => project.generateUuid()));
  assert.equal(ids.size, 100);
  for (const id of ids) assert.match(id, /^[A-F0-9]{24}$/);
});
