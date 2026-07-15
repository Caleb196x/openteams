import React from 'react';
import type {
  ShortcutPlatform,
  ShortcutSequence,
  ShortcutTranslate,
} from './types';

const MAC_MODIFIERS: Record<string, string> = {
  ctrl: '⌃',
  meta: '⌘',
  alt: '⌥',
  shift: '⇧',
};
const NAMED_KEYS: Record<string, string> = {
  enter: 'Enter',
  tab: 'Tab',
  escape: 'Esc',
  space: 'Space',
  delete: 'Delete',
  backspace: 'Backspace',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  comma: ',',
};

const formatKey = (key: string) => NAMED_KEYS[key] ?? key.toUpperCase();

export function formatShortcutStroke(
  stroke: string,
  platform: ShortcutPlatform,
) {
  const tokens = stroke.split('+');
  const key = tokens.at(-1) ?? '';
  const modifiers = tokens.slice(0, -1);
  if (platform === 'macos') {
    return `${modifiers.map((token) => MAC_MODIFIERS[token] ?? token).join('')}${formatKey(key)}`;
  }
  const labels = modifiers.map((token) => {
    if (token === 'ctrl') return 'Ctrl';
    if (token === 'meta') return 'Meta';
    if (token === 'alt') return 'Alt';
    if (token === 'shift') return 'Shift';
    return token;
  });
  return [...labels, formatKey(key)].join('+');
}

export function formatShortcutSequence(
  sequence: ShortcutSequence,
  platform: ShortcutPlatform,
  _translate: ShortcutTranslate,
) {
  return sequence.map((stroke) => formatShortcutStroke(stroke, platform)).join(' ');
}

export function formatShortcutSequences(
  sequences: readonly ShortcutSequence[],
  platform: ShortcutPlatform,
  translate: ShortcutTranslate,
): string {
  if (
    sequences.length === 0 ||
    sequences.every((sequence) => sequence.length === 0)
  ) {
    return translate('shortcuts.unbound');
  }
  return sequences
    .map((sequence) => formatShortcutSequence(sequence, platform, translate))
    .join(' / ');
}

export function Keycap({
  sequences,
  platform,
  translate,
}: {
  sequences: readonly ShortcutSequence[];
  platform: ShortcutPlatform;
  translate: ShortcutTranslate;
}) {
  return (
    <kbd className="rounded border border-black/15 bg-black/5 px-1.5 py-0.5 text-[11px] dark:border-white/15 dark:bg-white/10">
      {formatShortcutSequences(sequences, platform, translate)}
    </kbd>
  );
}
