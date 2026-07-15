import type { ShortcutPlatform, ShortcutRuntime } from './types';

type RuntimeDetectionInput = {
  osType?: string | null;
  userAgentDataPlatform?: string | null;
  navigatorPlatform?: string | null;
  userAgent?: string | null;
  hasTauriInvoke: boolean;
};

const mapPlatform = (value?: string | null): ShortcutPlatform | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (
    normalized.includes('darwin') ||
    normalized.includes('macos') ||
    normalized.includes('mac os')
  ) {
    return 'macos';
  }
  if (normalized.includes('windows') || normalized.includes('win32')) {
    return 'windows';
  }
  if (
    normalized.includes('linux') ||
    normalized.includes('ubuntu') ||
    normalized.includes('debian')
  ) {
    return 'linux';
  }
  return null;
};

export function detectShortcutRuntime(
  input: RuntimeDetectionInput,
): ShortcutRuntime {
  const candidates = [
    ['server', input.osType],
    ['user-agent-data', input.userAgentDataPlatform],
    ['navigator-platform', input.navigatorPlatform],
    ['user-agent', input.userAgent],
  ] as const;

  for (const [source, value] of candidates) {
    const platform = mapPlatform(value);
    if (platform) {
      return {
        platform,
        isDesktopShell: input.hasTauriInvoke,
        source,
      };
    }
  }

  return {
    platform: 'linux',
    isDesktopShell: input.hasTauriInvoke,
    source: 'fallback',
  };
}
