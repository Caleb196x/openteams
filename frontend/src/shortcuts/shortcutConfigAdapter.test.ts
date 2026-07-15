import assert from 'node:assert/strict';
import type { Config } from '@/types';
import { commandRegistry } from './commandRegistry';
import {
  readShortcutConfig,
  resetAllOverrides,
  resetCommandOverride,
} from './shortcutConfigAdapter';

const keyboard_shortcuts = {
  schema_version: 1,
  platform_overrides: {
    macos: {
      'search.open': { sequence: ['meta+shift+k'] },
      'session.create': { sequence: [] },
      'future.command': { sequence: ['meta+9'] },
      broken: { nope: true } as never,
    },
    windows: { 'search.open': { sequence: ['ctrl+shift+k'] } },
    linux: {},
  },
};
const config = { keyboard_shortcuts } as unknown as Config;

const mac = readShortcutConfig(config, 'macos', commandRegistry);
assert.deepEqual(mac.overrides['search.open'], ['meta+shift+k']);
assert.deepEqual(mac.overrides['session.create'], []);
assert.equal(mac.overrides['future.command'], undefined);
assert.deepEqual(mac.preservedUnknown['future.command'], {
  sequence: ['meta+9'],
});
assert.deepEqual(mac.invalidCommandIds, ['broken']);

const windows = readShortcutConfig(config, 'windows', commandRegistry);
assert.deepEqual(windows.overrides['search.open'], ['ctrl+shift+k']);
assert.equal(windows.overrides['session.create'], undefined);

const resetOne = resetCommandOverride(
  keyboard_shortcuts,
  'macos',
  'search.open',
);
assert.equal(resetOne.platform_overrides.macos?.['search.open'], undefined);
assert.deepEqual(
  resetOne.platform_overrides.windows,
  keyboard_shortcuts.platform_overrides.windows,
);

const resetAll = resetAllOverrides(keyboard_shortcuts, 'macos');
assert.deepEqual(resetAll.platform_overrides.macos, {});
assert.deepEqual(
  resetAll.platform_overrides.windows,
  keyboard_shortcuts.platform_overrides.windows,
);

console.log('shortcutConfigAdapter: PASS');
