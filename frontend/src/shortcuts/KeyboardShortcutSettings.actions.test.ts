import assert from 'node:assert/strict';
import {
  findBindingConflicts,
  reservedBindingResult,
} from './bindingResolver';
import { contextsMayOverlap } from './contextRules';
import {
  persistOverrideSet,
  replaceConflictingBinding,
} from './KeyboardShortcutSettings';

const candidate = {
  commandId: 'search.open',
  sequence: ['meta+n'],
  contexts: ['global'],
} as const;
const existing = [
  {
    commandId: 'session.create',
    sequence: ['meta+n'],
    contexts: ['session-workspace'],
  },
] as const;
assert.deepEqual(findBindingConflicts(candidate, existing), [
  {
    commandId: 'search.open',
    conflictingCommandId: 'session.create',
    kind: 'exact',
  },
]);
assert.equal(contextsMayOverlap('issue-list', 'issue-detail'), false);
assert.deepEqual(
  reservedBindingResult(['meta+space'], {
    platform: 'macos',
    isDesktopShell: true,
  }),
  { kind: 'blocked', reasonKey: 'shortcuts.error.systemReserved' },
);
assert.deepEqual(
  reservedBindingResult(['ctrl+tab'], {
    platform: 'windows',
    isDesktopShell: false,
  }),
  { kind: 'warning', reasonKey: 'shortcuts.warning.browserReserved' },
);
assert.deepEqual(
  reservedBindingResult(['ctrl+tab'], {
    platform: 'windows',
    isDesktopShell: true,
  }),
  { kind: 'allowed' },
);

assert.deepEqual(
  replaceConflictingBinding(
    {},
    'search.open',
    ['meta+n'],
    'session.create',
  ),
  {
    'search.open': { sequence: ['meta+n'] },
    'session.create': { sequence: [] },
  },
);
const previous = { 'search.open': { sequence: ['meta+k'] } };
const removal = { ...previous, 'search.open': { sequence: [] } };
let attempts = 0;
await assert.rejects(
  persistOverrideSet(removal, async () => {
    attempts += 1;
    throw new Error('disk full');
  }),
  /disk full/,
);
assert.equal(attempts, 1);
assert.deepEqual(previous, { 'search.open': { sequence: ['meta+k'] } });
const acknowledged = await persistOverrideSet(removal, async (next) => next);
assert.deepEqual(acknowledged['search.open'], { sequence: [] });
console.log('KeyboardShortcutSettings actions: PASS');
