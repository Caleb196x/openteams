import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Config } from '@/types';
import {
  ShortcutProvider,
  useCommandHandler,
  useShortcutCapture,
} from './ShortcutProvider';

const dom = new JSDOM('<!doctype html><div id="root"></div>', {
  url: 'http://localhost',
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  HTMLIFrameElement: dom.window.HTMLIFrameElement,
  KeyboardEvent: dom.window.KeyboardEvent,
  FocusEvent: dom.window.FocusEvent,
  Event: dom.window.Event,
});
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: dom.window.navigator,
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const calls: string[] = [];
function Harness() {
  useCommandHandler('search.open', {
    scope: 'global',
    enabled: true,
    execute: () => {
      calls.push('search');
    },
  });
  useShortcutCapture({
    active: true,
    onKeyDown: (event) => {
      calls.push(`capture:${event.code}`);
      return true;
    },
  });
  return <input data-testid="capture" />;
}

const config = {
  keyboard_shortcuts: { schema_version: 1, platform_overrides: {} },
} as unknown as Config;
const root = createRoot(document.getElementById('root')!);
await act(async () => {
  root.render(
    <ShortcutProvider
      runtime={{ platform: 'macos', isDesktopShell: true, source: 'server' }}
      translate={(key) => key}
      config={config}
      saveConfigPatch={async (patch) => ({ ...config, ...patch })}
      showToast={() => undefined}
    >
      <Harness />
    </ShortcutProvider>,
  );
});

const press = (target: EventTarget, init: KeyboardEventInit) => {
  const event = new window.KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};

const input = document.querySelector<HTMLInputElement>('[data-testid="capture"]')!;
input.focus();
const captured = press(input, { key: 'k', code: 'KeyK', metaKey: true });
await act(async () => undefined);
assert.equal(captured.defaultPrevented, true);
assert.deepEqual(calls, ['capture:KeyK'], 'capture prevents search handler');
calls.length = 0;
press(input, { key: 'с', code: 'KeyC' });
press(input, { key: 'p', code: 'KeyP' });
assert.deepEqual(calls, ['capture:KeyC', 'capture:KeyP']);

await act(async () => root.unmount());
calls.length = 0;
press(document.body, { key: 'k', code: 'KeyK', metaKey: true });
assert.deepEqual(calls, [], 'capture lease is released on unmount');
console.log('ShortcutProvider capture: PASS');
