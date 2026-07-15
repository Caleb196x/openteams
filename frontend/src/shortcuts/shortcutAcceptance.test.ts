// End-to-end acceptance tests for shortcut compatibility warnings and
// focused-root Enter mutual exclusion.
//
//     pnpm exec tsx src/shortcuts/shortcutAcceptance.test.ts

import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  mergeEffectiveBindings,
  reservedBindingResult,
  resolveBinding,
} from './bindingResolver';
import { commandRegistry } from './commandRegistry';
import {
  contextsMayOverlap,
  resolveActiveShortcutContexts,
} from './contextRules';
import type {
  EffectiveBinding,
  KeyboardEventSnapshot,
  ShortcutRuntime,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const browserRuntime: Pick<ShortcutRuntime, 'platform' | 'isDesktopShell'> = {
  platform: 'windows',
  isDesktopShell: false,
};

const tauriRuntime: Pick<ShortcutRuntime, 'platform' | 'isDesktopShell'> = {
  platform: 'windows',
  isDesktopShell: true,
};

const defaultBindingsFor = (platform: 'macos' | 'windows' | 'linux') =>
  mergeEffectiveBindings(commandRegistry, platform, {}).bindings;

// ---------------------------------------------------------------------------
// 1. Browser: Ctrl+Tab / Ctrl+Shift+Tab show compatibility warning
//    but still allow configuration and execution.
// ---------------------------------------------------------------------------

// 1a. reservedBindingResult returns 'warning' in browser for both sequences.
const browserTabResult = reservedBindingResult(['ctrl+tab'], browserRuntime);
assert.equal(
  browserTabResult.kind,
  'warning',
  'browser: ctrl+tab should produce a warning, not a block',
);
assert.equal(
  browserTabResult.kind === 'warning' ? browserTabResult.reasonKey : null,
  'shortcuts.warning.browserReserved',
  'browser: ctrl+tab warning reasonKey should be browserReserved',
);
const browserShiftTabResult = reservedBindingResult(
  ['ctrl+shift+tab'],
  browserRuntime,
);
assert.equal(
  browserShiftTabResult.kind,
  'warning',
  'browser: ctrl+shift+tab should produce a warning, not a block',
);
assert.equal(
  browserShiftTabResult.kind === 'warning'
    ? browserShiftTabResult.reasonKey
    : null,
  'shortcuts.warning.browserReserved',
  'browser: ctrl+shift+tab warning reasonKey should be browserReserved',
);

// 1b. The warning is not a block — commands are still registered and
//     customizable.
const tabCommands = commandRegistry.filter(
  (cmd) =>
    cmd.id === 'session-tab.next' || cmd.id === 'session-tab.previous',
);
assert.equal(tabCommands.length, 2, 'session-tab.next and previous must exist');
for (const cmd of tabCommands) {
  assert.equal(cmd.customizable, true, `${cmd.id} must remain customizable`);
}

// 1c. Default bindings include both sequences and can be merged.
const browserBindings = defaultBindingsFor('windows');
const nextBinding = browserBindings.find(
  (b) => b.commandId === 'session-tab.next',
);
const prevBinding = browserBindings.find(
  (b) => b.commandId === 'session-tab.previous',
);
assert.ok(nextBinding, 'session-tab.next must have a default binding');
assert.ok(prevBinding, 'session-tab.previous must have a default binding');
assert.deepEqual(
  nextBinding!.sequence,
  ['ctrl+tab'],
  'session-tab.next default is ctrl+tab',
);
assert.deepEqual(
  prevBinding!.sequence,
  ['ctrl+shift+tab'],
  'session-tab.previous default is ctrl+shift+tab',
);

// 1d. The warning does not prevent execution — resolveBinding still fires.
const ctrlTabEvent = event('Tab', 'Tab', { ctrlKey: true });
const ctrlShiftTabEvent = event('Tab', 'Tab', {
  ctrlKey: true,
  shiftKey: true,
});
const allCommandIds = new Set(commandRegistry.map((c) => c.id));
const globalContext = new Set(['global'] as const);

assert.deepEqual(
  resolveBinding({
    event: ctrlTabEvent,
    chordPrefix: null,
    bindings: browserBindings,
    availableCommandIds: allCommandIds,
    activeContextIds: globalContext,
    now: 0,
  }),
  { kind: 'execute', commandId: 'session-tab.next' },
  'browser: ctrl+tab must still execute despite the warning',
);
assert.deepEqual(
  resolveBinding({
    event: ctrlShiftTabEvent,
    chordPrefix: null,
    bindings: browserBindings,
    availableCommandIds: allCommandIds,
    activeContextIds: globalContext,
    now: 0,
  }),
  { kind: 'execute', commandId: 'session-tab.previous' },
  'browser: ctrl+shift+tab must still execute despite the warning',
);

// 1e. Custom override is accepted (configuration still works under warning).
const overridden = mergeEffectiveBindings(commandRegistry, 'windows', {
  'session-tab.next': { sequence: ['ctrl+pageup'] },
});
assert.deepEqual(
  overridden.bindings.find((b) => b.commandId === 'session-tab.next')?.sequence,
  ['ctrl+pageup'],
  'browser: session-tab.next can be overridden to ctrl+pageup',
);
assert.deepEqual(
  overridden.warnings.filter((w) => w.commandId === 'session-tab.next'),
  [],
  'browser: overriding session-tab.next away from ctrl+tab produces no merge warning',
);

// 1f. Session navigation uses vertical Alt+Arrow shortcuts and is scoped to
//     the session workspace rather than the global tab-switching context.
const nextSessionBinding = browserBindings.find(
  (binding) => binding.commandId === 'session.next',
);
const previousSessionBinding = browserBindings.find(
  (binding) => binding.commandId === 'session.previous',
);
assert.deepEqual(nextSessionBinding?.sequence, ['alt+arrowdown']);
assert.deepEqual(previousSessionBinding?.sequence, ['alt+arrowup']);
assert.deepEqual(nextSessionBinding?.contexts, ['session-workspace']);
assert.deepEqual(previousSessionBinding?.contexts, ['session-workspace']);

const sessionWorkspaceContexts = new Set([
  'global',
  'session-workspace',
] as const);
assert.deepEqual(
  resolveBinding({
    event: event('ArrowDown', 'ArrowDown', { altKey: true }),
    chordPrefix: null,
    bindings: browserBindings,
    availableCommandIds: allCommandIds,
    activeContextIds: sessionWorkspaceContexts,
    now: 0,
  }),
  { kind: 'execute', commandId: 'session.next' },
);
assert.deepEqual(
  resolveBinding({
    event: event('ArrowUp', 'ArrowUp', { altKey: true }),
    chordPrefix: null,
    bindings: browserBindings,
    availableCommandIds: allCommandIds,
    activeContextIds: sessionWorkspaceContexts,
    now: 0,
  }),
  { kind: 'execute', commandId: 'session.previous' },
);

// ---------------------------------------------------------------------------
// 2. Tauri desktop shell: Ctrl+Tab / Ctrl+Shift+Tab are fully allowed —
//    no compatibility warning.
// ---------------------------------------------------------------------------

assert.equal(
  reservedBindingResult(['ctrl+tab'], tauriRuntime).kind,
  'allowed',
  'tauri: ctrl+tab should be allowed (no warning)',
);
assert.equal(
  reservedBindingResult(['ctrl+shift+tab'], tauriRuntime).kind,
  'allowed',
  'tauri: ctrl+shift+tab should be allowed (no warning)',
);

// Tauri also does not warn on macos.
const tauriMacRuntime: Pick<ShortcutRuntime, 'platform' | 'isDesktopShell'> = {
  platform: 'macos',
  isDesktopShell: true,
};
assert.equal(
  reservedBindingResult(['ctrl+tab'], tauriMacRuntime).kind,
  'allowed',
  'tauri/macos: ctrl+tab should be allowed (no warning)',
);
assert.equal(
  reservedBindingResult(['ctrl+shift+tab'], tauriMacRuntime).kind,
  'allowed',
  'tauri/macos: ctrl+shift+tab should be allowed (no warning)',
);

// ---------------------------------------------------------------------------
// 3. Focused-root Enter mutual exclusion.
//    Two sibling focused roots (workflow-graph and workflow-review) both
//    bind Enter.  When focus is in one root, only that root's context is
//    active and Enter resolves to that root's command — never the sibling's.
// ---------------------------------------------------------------------------

const dom = new JSDOM(`<!doctype html><body>
  <div id="graph-root"><button id="graph-button">graph</button></div>
  <div id="review-root"><button id="review-button">review</button></div>
</body>`);
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
});

const graphRoot = document.getElementById('graph-root') as HTMLElement;
const reviewRoot = document.getElementById('review-root') as HTMLElement;
const graphButton = document.getElementById('graph-button') as HTMLElement;
const reviewButton = document.getElementById('review-button') as HTMLElement;

// 3a. contextsMayOverlap denies overlap between two distinct focused roots.
assert.equal(
  contextsMayOverlap('workflow-graph', 'workflow-review'),
  false,
  'workflow-graph and workflow-review must not overlap (mutually exclusive focused roots)',
);
assert.equal(
  contextsMayOverlap('workflow-graph', 'workflow-graph'),
  true,
  'same context may overlap itself',
);

// 3b. resolveActiveShortcutContexts activates only the focused sibling.
const scopeRegistrations = [
  {
    contextId: 'workflow-graph' as const,
    active: true,
    rootRef: { current: graphRoot },
  },
  {
    contextId: 'workflow-review' as const,
    active: true,
    rootRef: { current: reviewRoot },
  },
];

assert.deepEqual(
  [...resolveActiveShortcutContexts(scopeRegistrations, graphButton)].sort(),
  ['global', 'workflow-graph'],
  'Enter in graph root: only workflow-graph context is active',
);
assert.deepEqual(
  [...resolveActiveShortcutContexts(scopeRegistrations, reviewButton)].sort(),
  ['global', 'workflow-review'],
  'Enter in review root: only workflow-review context is active',
);

// 3c. End-to-end: Enter resolves to the correct command per focused root.
const enterEvent = event('Enter', 'Enter');
const graphEnterBinding: EffectiveBinding = {
  commandId: 'workflow.node.open',
  sequence: ['enter'],
  contexts: ['workflow-graph'],
  scopeRank: 300,
  registrationOrder: 1,
};
const reviewEnterBinding: EffectiveBinding = {
  commandId: 'workflow.review.confirm',
  sequence: ['enter'],
  contexts: ['workflow-review'],
  scopeRank: 300,
  registrationOrder: 2,
};
const enterBindings = [graphEnterBinding, reviewEnterBinding];
const enterCommandIds = new Set(['workflow.node.open', 'workflow.review.confirm']);

// Enter in graph root -> workflow.node.open (never review.confirm)
assert.deepEqual(
  resolveBinding({
    event: enterEvent,
    chordPrefix: null,
    bindings: enterBindings,
    availableCommandIds: enterCommandIds,
    activeContextIds: new Set(['global', 'workflow-graph']),
    now: 0,
  }),
  { kind: 'execute', commandId: 'workflow.node.open' },
  'Enter in graph root must resolve to workflow.node.open',
);

// Enter in review root -> workflow.review.confirm (never node.open)
assert.deepEqual(
  resolveBinding({
    event: enterEvent,
    chordPrefix: null,
    bindings: enterBindings,
    availableCommandIds: enterCommandIds,
    activeContextIds: new Set(['global', 'workflow-review']),
    now: 0,
  }),
  { kind: 'execute', commandId: 'workflow.review.confirm' },
  'Enter in review root must resolve to workflow.review.confirm',
);

// 3d. Enter outside both focused roots resolves to 'none' for these bindings.
assert.deepEqual(
  resolveBinding({
    event: enterEvent,
    chordPrefix: null,
    bindings: enterBindings,
    availableCommandIds: enterCommandIds,
    activeContextIds: new Set(['global']),
    now: 0,
  }),
  { kind: 'none' },
  'Enter outside both focused roots must not trigger either Enter command',
);

console.log('shortcutAcceptance: PASS');
