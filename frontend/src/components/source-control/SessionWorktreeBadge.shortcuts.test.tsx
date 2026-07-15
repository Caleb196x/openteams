import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./SessionWorktreeBadge.tsx', import.meta.url), 'utf8');
assert.match(source, /<WorktreeActionButton[\s\S]*commandId="worktree\.merge"/);
assert.match(source, /<WorktreeActionButton[\s\S]*commandId="worktree\.discard"/);
assert.ok(source.includes('ALLOWED_ACTIONS'));
assert.equal(source.includes('title="worktree.merge"'), false);
assert.equal(source.includes('title="worktree.discard"'), false);
console.log('SessionWorktreeBadge shortcut metadata: PASS');
