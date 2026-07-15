import assert from 'node:assert/strict';
import {
  findBindingConflicts,
  mergeEffectiveBindings,
  normalizeKeyboardEvent,
  reservedBindingResult,
  resolveBinding,
} from './bindingResolver';
import { commandRegistry } from './commandRegistry';
import type { EffectiveBinding, KeyboardEventSnapshot } from './types';

const event = (
  key: string,
  code: string,
  input: Partial<KeyboardEventSnapshot> = {},
): KeyboardEventSnapshot => ({
  key,
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  altGraph: false,
  ...input,
});

assert.equal(
  normalizeKeyboardEvent(
    event('P', 'KeyP', { metaKey: true, shiftKey: true }),
  ),
  'meta+shift+p',
);
assert.equal(
  normalizeKeyboardEvent(event(',', 'Comma', { ctrlKey: true })),
  'ctrl+comma',
);
assert.equal(
  normalizeKeyboardEvent(event('?', 'Slash', { shiftKey: true })),
  'shift+/',
);
assert.equal(normalizeKeyboardEvent(event('с', 'KeyC')), 'c');
assert.equal(normalizeKeyboardEvent(event('ち', 'KeyA')), 'a');
assert.equal(normalizeKeyboardEvent(event('C', '')), 'c');
assert.equal(normalizeKeyboardEvent(event('é', '')), null);
for (const key of ['Dead', 'Unidentified', 'Process']) {
  assert.equal(normalizeKeyboardEvent(event(key, '')), null);
}
assert.equal(
  normalizeKeyboardEvent(
    event('@', 'Digit2', {
      ctrlKey: true,
      altKey: true,
      altGraph: true,
    }),
  ),
  null,
);
assert.equal(normalizeKeyboardEvent(event(',', 'Comma')), 'comma');
assert.equal(normalizeKeyboardEvent(event('/', 'Slash')), '/');
assert.equal(normalizeKeyboardEvent(event('=', 'Equal')), '=');
assert.equal(normalizeKeyboardEvent(event('-', 'Minus')), '-');
assert.equal(normalizeKeyboardEvent(event('ArrowLeft', 'ArrowLeft')), 'arrowleft');
assert.equal(normalizeKeyboardEvent(event('Enter', 'Enter')), 'enter');

const chordBinding: EffectiveBinding = {
  commandId: 'project.create',
  sequence: ['c', 'p'],
  contexts: ['global'],
  scopeRank: 100,
  registrationOrder: 1,
};
const resolve = (
  snapshot: KeyboardEventSnapshot,
  chordPrefix: string | null,
) =>
  resolveBinding({
    event: snapshot,
    chordPrefix,
    bindings: [chordBinding],
    availableCommandIds: new Set(['project.create']),
    activeContextIds: new Set(['global']),
    now: 50,
  });
assert.deepEqual(resolve(event('c', 'KeyC'), null), {
  kind: 'waiting',
  prefix: 'c',
  expiresAt: 1250,
});
assert.deepEqual(resolve(event('p', 'KeyP'), 'c'), {
  kind: 'execute',
  commandId: 'project.create',
});
assert.deepEqual(resolve(event('x', 'KeyX'), 'c'), { kind: 'none' });

const merged = mergeEffectiveBindings(commandRegistry, 'macos', {
  'session.create': { sequence: [] },
  'search.open': { sequence: ['meta+shift+k'] },
  'future.command': { sequence: ['meta+9'] },
  broken: { no_sequence: true },
});
assert.equal(
  merged.bindings.some((item) => item.commandId === 'session.create'),
  false,
);
assert.deepEqual(
  merged.bindings.find((item) => item.commandId === 'search.open')?.sequence,
  ['meta+shift+k'],
);
assert.deepEqual(merged.warnings, [
  { commandId: 'broken', kind: 'invalid' },
  { commandId: 'future.command', kind: 'unknown' },
]);

const conflict = (
  left: Pick<EffectiveBinding, 'commandId' | 'sequence' | 'contexts'>,
  right: Pick<EffectiveBinding, 'commandId' | 'sequence' | 'contexts'>,
) => findBindingConflicts(left, [right]);
assert.equal(
  conflict(
    { commandId: 'a', sequence: ['enter'], contexts: ['global'] },
    {
      commandId: 'b',
      sequence: ['enter'],
      contexts: ['source-control-list'],
    },
  )[0]?.kind,
  'exact',
);
assert.deepEqual(
  conflict(
    {
      commandId: 'a',
      sequence: ['enter'],
      contexts: ['source-control-list'],
    },
    {
      commandId: 'b',
      sequence: ['enter'],
      contexts: ['source-control-commit'],
    },
  ),
  [],
);
assert.deepEqual(
  conflict(
    {
      commandId: 'a',
      sequence: ['enter'],
      contexts: ['workflow-graph'],
    },
    {
      commandId: 'b',
      sequence: ['enter'],
      contexts: ['workflow-review'],
    },
  ),
  [],
);
assert.deepEqual(
  conflict(
    {
      commandId: 'source-control.commit',
      sequence: ['meta+enter'],
      contexts: ['source-control-commit'],
    },
    {
      commandId: 'workflow.start',
      sequence: ['meta+enter'],
      contexts: ['workflow-preview'],
    },
  ),
  [],
);
assert.equal(
  conflict(
    {
      commandId: 'a',
      sequence: ['enter'],
      contexts: ['workflow-running'],
    },
    {
      commandId: 'b',
      sequence: ['enter'],
      contexts: ['workflow-review'],
    },
  )[0]?.kind,
  'exact',
);
assert.equal(
  conflict(
    { commandId: 'a', sequence: ['c'], contexts: ['global'] },
    { commandId: 'b', sequence: ['c', 'p'], contexts: ['global'] },
  )[0]?.kind,
  'prefix',
);
for (const platform of ['macos', 'windows', 'linux'] as const) {
  const defaults = mergeEffectiveBindings(commandRegistry, platform, {}).bindings;
  for (let leftIndex = 0; leftIndex < defaults.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < defaults.length;
      rightIndex += 1
    ) {
      const left = defaults[leftIndex];
      const right = defaults[rightIndex];
      if (left.commandId === right.commandId) continue;
      assert.deepEqual(
        findBindingConflicts(left, [right]),
        [],
        `${platform}: ${left.commandId} conflicts with ${right.commandId}`,
      );
    }
  }
}
assert.equal(
  reservedBindingResult(['meta+space'], {
    platform: 'macos',
    isDesktopShell: true,
  }).kind,
  'blocked',
);
assert.equal(
  reservedBindingResult(['ctrl+tab'], {
    platform: 'windows',
    isDesktopShell: false,
  }).kind,
  'warning',
);
console.log('bindingResolver: PASS');
