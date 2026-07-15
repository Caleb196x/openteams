import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./AgentsPage.tsx', import.meta.url), 'utf8');
assert.ok(source.includes("useShortcutScope('agent-runtime'"));
assert.ok(source.includes("useCommandHandler('agent-runtime.sidebar.toggle'"));
assert.ok(source.includes('execute: toggleAgentNavCollapsed'));
const legacy = /window\.addEventListener\(["']keydown["'][\s\S]{0,500}toggleAgentNavCollapsed/;
assert.equal(legacy.test(source), false);
console.log('AgentsPage shortcuts: PASS');
