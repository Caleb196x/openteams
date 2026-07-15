import assert from 'node:assert/strict';
import { detectShortcutRuntime } from './platform';

assert.deepEqual(
  detectShortcutRuntime({
    osType: 'Darwin 24.5',
    userAgentDataPlatform: 'Windows',
    navigatorPlatform: 'Win32',
    userAgent: 'Windows NT 10.0',
    hasTauriInvoke: false,
  }),
  { platform: 'macos', isDesktopShell: false, source: 'server' },
);
assert.deepEqual(
  detectShortcutRuntime({
    osType: 'Windows',
    userAgentDataPlatform: 'macOS',
    hasTauriInvoke: true,
  }),
  { platform: 'windows', isDesktopShell: true, source: 'server' },
);
assert.deepEqual(
  detectShortcutRuntime({ osType: 'Ubuntu Linux', hasTauriInvoke: false }),
  { platform: 'linux', isDesktopShell: false, source: 'server' },
);
assert.deepEqual(
  detectShortcutRuntime({
    userAgentDataPlatform: 'macOS',
    navigatorPlatform: 'Win32',
    userAgent: 'Windows NT 10.0',
    hasTauriInvoke: false,
  }),
  { platform: 'macos', isDesktopShell: false, source: 'user-agent-data' },
);
assert.deepEqual(
  detectShortcutRuntime({
    navigatorPlatform: 'Win32',
    userAgent: 'X11; Linux x86_64',
    hasTauriInvoke: true,
  }),
  { platform: 'windows', isDesktopShell: true, source: 'navigator-platform' },
);
assert.deepEqual(
  detectShortcutRuntime({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    hasTauriInvoke: false,
  }),
  { platform: 'linux', isDesktopShell: false, source: 'user-agent' },
);
assert.deepEqual(
  detectShortcutRuntime({
    osType: 'Plan9',
    userAgentDataPlatform: 'Unknown',
    navigatorPlatform: 'Unknown',
    userAgent: 'Unknown',
    hasTauriInvoke: true,
  }),
  { platform: 'linux', isDesktopShell: true, source: 'fallback' },
);
console.log('platform: PASS');
