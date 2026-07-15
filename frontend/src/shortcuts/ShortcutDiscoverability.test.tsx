import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatShortcutSequences } from './Keycap';

const translate = (key: string) =>
  ({
    'shortcuts.unbound': 'Not assigned',
  })[key] ?? key;
assert.equal(
  formatShortcutSequences([['meta+shift+p']], 'macos', translate),
  '⌘⇧P',
);
assert.equal(
  formatShortcutSequences([['ctrl+shift+p']], 'windows', translate),
  'Ctrl+Shift+P',
);
assert.equal(
  formatShortcutSequences([['ctrl+shift+p']], 'linux', translate),
  'Ctrl+Shift+P',
);
const chordLabel = formatShortcutSequences([['c', 'p']], 'windows', translate);
assert.ok(chordLabel.includes('C') && chordLabel.includes('P'));
assert.equal(chordLabel.includes('C+P'), false);
assert.equal(formatShortcutSequences([], 'macos', translate), 'Not assigned');

const tooltip = readFileSync(
  new URL('./CommandTooltip.tsx', import.meta.url),
  'utf8',
);
const palette = readFileSync(
  new URL('./CommandPalette.tsx', import.meta.url),
  'utf8',
);
const help = readFileSync(
  new URL('./ShortcutHelpDialog.tsx', import.meta.url),
  'utf8',
);
const chord = readFileSync(
  new URL('./ChordHintOverlay.tsx', import.meta.url),
  'utf8',
);
assert.ok(tooltip.includes('useCommandPresentation(commandId)'));
assert.ok(tooltip.includes('role="tooltip"'));
assert.ok(tooltip.includes("'aria-describedby': describedBy"));
assert.ok(
  tooltip.includes("'aria-keyshortcuts': presentation.ariaKeyShortcuts"),
);
assert.ok(tooltip.includes('onPointerEnter'));
assert.ok(tooltip.includes('onFocusCapture'));
assert.equal(tooltip.includes('title={presentation.tooltip}'), false);
assert.ok(palette.includes('data-command-palette'));
assert.ok(palette.includes('data-command-search'));
assert.ok(palette.includes('data-command-id={command.id}'));
assert.ok(palette.includes('executeCommand(command.id'));
assert.ok(help.includes('data-shortcut-help'));
assert.ok(help.includes('data-command-id={command.id}'));
assert.ok(chord.includes('data-chord-hint'));
assert.ok(chord.includes('aria-live="polite"'));
assert.equal(chord.includes('.focus()'), false);
console.log('Shortcut discoverability: PASS');
