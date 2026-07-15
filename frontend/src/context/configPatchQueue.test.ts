import assert from 'node:assert/strict';
import { createConfigPatchQueue } from './configPatchQueue';

type FixtureConfig = {
  theme: 'LIGHT' | 'DARK';
  language: 'EN' | 'ZH_HANS';
  keyboard_shortcuts: { schema_version: number; platform_overrides: object };
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

const emptyShortcuts = { schema_version: 1, platform_overrides: {} };
const customShortcuts = {
  schema_version: 1,
  platform_overrides: { macos: { 'search.open': { sequence: ['meta+9'] } } },
};
const first = deferred<FixtureConfig>();
const second = deferred<FixtureConfig>();
const requests: FixtureConfig[] = [];
const published: FixtureConfig[] = [];
const gates = [first, second];
const queue = createConfigPatchQueue<FixtureConfig>(
  { theme: 'LIGHT', language: 'EN', keyboard_shortcuts: emptyShortcuts },
  async (candidate) => {
    requests.push(candidate);
    return gates[requests.length - 1].promise;
  },
  (visible) => published.push(visible),
);
assert.equal(published.length, 1, 'initial config is published immediately');
assert.equal(published[0].theme, 'LIGHT');

const shortcutSave = queue.enqueue(
  { keyboard_shortcuts: customShortcuts },
  { optimistic: false },
);
await Promise.resolve();
assert.equal(requests.length, 1);
assert.equal(published.length, 1, 'unacknowledged shortcuts stay hidden');

const themeSave = queue.enqueue({ theme: 'DARK' }, { optimistic: true });
assert.equal(published.at(-1)?.theme, 'DARK');
assert.deepEqual(published.at(-1)?.keyboard_shortcuts, emptyShortcuts);

first.resolve(requests[0]);
await shortcutSave;
await Promise.resolve();
assert.equal(requests.length, 2);
assert.equal(requests[1].theme, 'DARK');
assert.deepEqual(requests[1].keyboard_shortcuts, customShortcuts);
assert.equal(published.at(-1)?.theme, 'DARK');
assert.deepEqual(published.at(-1)?.keyboard_shortcuts, customShortcuts);

second.resolve(requests[1]);
await themeSave;
assert.deepEqual(queue.getAcknowledged(), requests[1]);

const failed = deferred<FixtureConfig>();
const failingQueue = createConfigPatchQueue<FixtureConfig>(
  requests[1],
  () => failed.promise,
  (visible) => published.push(visible),
);
const rejected = failingQueue.enqueue(
  { language: 'ZH_HANS' },
  { optimistic: true },
);
failed.reject(new Error('disk full'));
await assert.rejects(rejected, /disk full/);
assert.equal(failingQueue.getAcknowledged().language, 'EN');
assert.equal(failingQueue.getVisible().language, 'EN');

console.log('configPatchQueue: PASS');
