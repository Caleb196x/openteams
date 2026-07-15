import type { Config } from '@/types';
import type {
  KeyboardShortcutOverride,
  KeyboardShortcutsConfig,
} from '../../../shared/types';
import type {
  CommandDefinition,
  ShortcutPlatform,
  ShortcutSequence,
} from './types';

export type ReadShortcutConfigResult = {
  overrides: Record<string, ShortcutSequence>;
  preservedUnknown: Record<string, KeyboardShortcutOverride>;
  invalidCommandIds: string[];
};

const readBinding = (value: unknown): ShortcutSequence | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const sequence = (value as { sequence?: unknown }).sequence;
  return Array.isArray(sequence) &&
    sequence.length <= 2 &&
    sequence.every((stroke) => typeof stroke === 'string')
    ? sequence
    : null;
};

export function readShortcutConfig(
  config: Config,
  platform: ShortcutPlatform,
  registry: readonly CommandDefinition[],
): ReadShortcutConfigResult {
  const knownIds = new Set(registry.map((definition) => definition.id));
  const platformOverrides = config.keyboard_shortcuts.platform_overrides[platform] ?? {};
  const overrides: Record<string, ShortcutSequence> = {};
  const preservedUnknown: Record<string, KeyboardShortcutOverride> = {};
  const invalidCommandIds: string[] = [];

  for (const commandId of Object.keys(platformOverrides).sort()) {
    const value = platformOverrides[commandId];
    const sequence = readBinding(value);
    if (!sequence) {
      invalidCommandIds.push(commandId);
    } else if (knownIds.has(commandId)) {
      overrides[commandId] = sequence;
    } else {
      preservedUnknown[commandId] = value!;
    }
  }

  return { overrides, preservedUnknown, invalidCommandIds };
}

export function buildShortcutConfigPatch(
  current: KeyboardShortcutsConfig,
  platform: ShortcutPlatform,
  overrides: Record<string, KeyboardShortcutOverride>,
): KeyboardShortcutsConfig {
  return {
    ...current,
    platform_overrides: {
      ...current.platform_overrides,
      [platform]: overrides,
    },
  };
}

export function resetCommandOverride(
  config: KeyboardShortcutsConfig,
  platform: ShortcutPlatform,
  commandId: string,
): KeyboardShortcutsConfig {
  const platformOverrides = Object.fromEntries(
    Object.entries(config.platform_overrides[platform] ?? {}).filter(
      (entry): entry is [string, KeyboardShortcutOverride] =>
        entry[1] !== undefined,
    ),
  );
  delete platformOverrides[commandId];
  return buildShortcutConfigPatch(config, platform, platformOverrides);
}

export function resetAllOverrides(
  config: KeyboardShortcutsConfig,
  platform: ShortcutPlatform,
): KeyboardShortcutsConfig {
  return buildShortcutConfigPatch(config, platform, {});
}

export async function saveShortcutConfig(
  current: Config,
  keyboardShortcuts: KeyboardShortcutsConfig,
  saveConfigPatch: (patch: Partial<Config>) => Promise<Config>,
): Promise<Config> {
  return saveConfigPatch({ keyboard_shortcuts: keyboardShortcuts });
}
