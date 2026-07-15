import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./WorktreeActionButton.tsx', import.meta.url), 'utf8');
const tooltip = readFileSync(new URL('../../shortcuts/CommandTooltip.tsx', import.meta.url), 'utf8');
assert.ok(source.includes('commandId?: string'));
assert.ok(source.includes('<CommandTooltip commandId={commandId}>'));
assert.ok(tooltip.includes('aria-disabled={disabledButton || undefined}'));
assert.ok(tooltip.includes('tabIndex={disabledButton ? 0 : undefined}'));
assert.equal(
  /commandId[\s\S]{0,500}title=/.test(source),
  false,
  'command-backed action must not use a native title',
);
console.log('WorktreeActionButton shortcut accessibility: PASS');
