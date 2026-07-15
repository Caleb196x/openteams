import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import type {
  CommandHandlerRegistration,
  EffectiveBinding,
} from './types';
import {
  contextsMayOverlap,
  hasBlockingModalOrMenu,
  isEmbeddedEditorFocused,
  rankShortcutScope,
  resolveActiveShortcutContexts,
  shouldIgnoreKeyboardEvent,
} from './contextRules';

const dom = new JSDOM(`<!doctype html><body>
  <input id="input">
  <textarea id="commit"></textarea>
  <textarea id="other"></textarea>
  <div id="editable" contenteditable="true"></div>
  <div id="left-root"><button id="left-button">left</button></div>
  <div id="right-root"><button id="right-button">right</button></div>
  <div id="outer-root"><div id="inner-root"><button id="inner-button">inner</button></div></div>
  <iframe id="editor" tabindex="0"></iframe>
</body>`);
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  HTMLIFrameElement: dom.window.HTMLIFrameElement,
  KeyboardEvent: dom.window.KeyboardEvent,
});

const input = document.getElementById('input') as HTMLInputElement;
const commitTextarea = document.getElementById('commit') as HTMLTextAreaElement;
const otherTextarea = document.getElementById('other') as HTMLTextAreaElement;
const editable = document.getElementById('editable') as HTMLElement;
const iframe = document.getElementById('editor') as HTMLIFrameElement;
const leftRoot = document.getElementById('left-root') as HTMLElement;
const rightRoot = document.getElementById('right-root') as HTMLElement;
const outerRoot = document.getElementById('outer-root') as HTMLElement;
const innerRoot = document.getElementById('inner-root') as HTMLElement;
const innerButton = document.getElementById('inner-button') as HTMLElement;

const binding = (
  commandId: string,
  sequence: readonly string[],
  contexts: EffectiveBinding['contexts'],
): EffectiveBinding => ({
  commandId,
  sequence,
  contexts,
  scopeRank: 100,
  registrationOrder: 1,
});
const handler = (
  commandId: string,
  input: Partial<CommandHandlerRegistration> = {},
): CommandHandlerRegistration => ({
  commandId,
  scope: 'global',
  enabled: true,
  registrationOrder: 1,
  execute: () => undefined,
  ...input,
});
const eventFrom = (
  target: EventTarget,
  init: KeyboardEventInit = { key: 'k', code: 'KeyK', metaKey: true },
) => {
  const event = new window.KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  Object.defineProperty(event, 'target', { value: target });
  return event;
};

const chordBinding = binding('issue.create', ['g', 'i'], ['issue-list']);
const searchBinding = binding('search.open', ['meta+k'], ['global']);
const commitBinding = binding(
  'source-control.commit',
  ['meta+enter'],
  ['source-control-commit'],
);
const issueBinding = binding('issue.create', ['c', 'i'], ['issue-list']);
const globalHandler = handler('search.open');
const commitHandler = handler('source-control.commit', {
  scope: 'focused-component',
  contexts: ['source-control-commit'],
  allowInEditable: true,
  ownsEventTarget: (target) => target === commitTextarea,
});
const issuePageHandler = handler('issue.create', {
  scope: 'page',
  contexts: ['issue-list'],
});
const composingEvent = eventFrom(document.body, {
  key: 'Process',
  code: 'KeyK',
  isComposing: true,
});

assert.equal(
  shouldIgnoreKeyboardEvent(eventFrom(input), chordBinding, globalHandler),
  true,
);
assert.equal(
  shouldIgnoreKeyboardEvent(eventFrom(input), searchBinding, globalHandler),
  false,
);
assert.equal(
  shouldIgnoreKeyboardEvent(
    eventFrom(commitTextarea),
    commitBinding,
    commitHandler,
  ),
  false,
);
assert.equal(
  shouldIgnoreKeyboardEvent(
    eventFrom(otherTextarea),
    commitBinding,
    commitHandler,
  ),
  true,
);
assert.equal(
  shouldIgnoreKeyboardEvent(eventFrom(editable), chordBinding, globalHandler),
  true,
);
assert.equal(
  shouldIgnoreKeyboardEvent(composingEvent, searchBinding, globalHandler),
  true,
);
document.body.insertAdjacentHTML(
  'beforeend',
  '<div role="dialog" aria-modal="true"></div><div role="menu"></div>',
);
assert.equal(hasBlockingModalOrMenu(document), true);
assert.equal(
  shouldIgnoreKeyboardEvent(
    eventFrom(document.body),
    issueBinding,
    issuePageHandler,
  ),
  true,
);
iframe.focus();
assert.equal(isEmbeddedEditorFocused(document), true);
assert.equal(leftRoot.contains(document.getElementById('left-button')), true);
assert.equal(rightRoot.contains(document.getElementById('right-button')), true);
assert.deepEqual(
  [...resolveActiveShortcutContexts(
    [
      {
        contextId: 'workflow-preview',
        active: true,
        rootRef: { current: outerRoot },
      },
      {
        contextId: 'workflow-graph',
        active: true,
        rootRef: { current: innerRoot },
      },
    ],
    innerButton,
  )].sort(),
  ['global', 'workflow-graph'],
  'the deepest matching focused root wins',
);
assert.deepEqual(
  [...resolveActiveShortcutContexts(
    [
      {
        contextId: 'workflow-graph',
        active: true,
        rootRef: { current: leftRoot },
      },
      {
        contextId: 'workflow-review',
        active: true,
        rootRef: { current: rightRoot },
      },
    ],
    document.getElementById('left-button'),
  )].sort(),
  ['global', 'workflow-graph'],
  'workflow graph Enter activates only the graph sibling root',
);
assert.deepEqual(
  [...resolveActiveShortcutContexts(
    [
      {
        contextId: 'workflow-graph',
        active: true,
        rootRef: { current: leftRoot },
      },
      {
        contextId: 'workflow-review',
        active: true,
        rootRef: { current: rightRoot },
      },
    ],
    document.getElementById('right-button'),
  )].sort(),
  ['global', 'workflow-review'],
  'workflow review Enter never leaves the graph sibling context active',
);
assert.equal(contextsMayOverlap('global', 'source-control-list'), true);
assert.equal(
  contextsMayOverlap('source-control-list', 'source-control-commit'),
  false,
);
assert.equal(
  contextsMayOverlap('source-control-commit', 'workflow-preview'),
  false,
);
assert.equal(contextsMayOverlap('workflow-graph', 'workflow-review'), false);
assert.equal(contextsMayOverlap('workflow-running', 'workflow-review'), true);
assert.equal(rankShortcutScope('recorder'), 500);
console.log('contextRules: PASS');
