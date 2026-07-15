import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./FreeChatWorkspace.tsx', import.meta.url), 'utf8');
assert.ok(source.includes("useShortcutScope('session-workspace'"));
assert.ok(source.includes("useCommandHandler('sidebar.right.toggle'"));
assert.ok(source.includes("useCommandHandler('source-control.open'"));
assert.ok(source.includes('openRelatedFiles();'));
assert.ok(source.includes('setSourceControlFocusRequestKey((value) => value + 1)'));
assert.ok(source.includes('focusRequestKey={sourceControlFocusRequestKey}'));
const commandBlock = source.slice(source.indexOf("useCommandHandler('source-control.open'"));
assert.equal(commandBlock.slice(0, commandBlock.indexOf('});') + 3).includes('process.cwd'), false);
console.log('FreeChatWorkspace shortcuts: PASS');
