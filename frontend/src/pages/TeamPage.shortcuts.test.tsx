import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./TeamPage.tsx', import.meta.url), 'utf8');
assert.ok(source.includes('consumeTeamMemberInviteTarget'));
assert.ok(source.includes('setAddMemberMenuRequestId((value) => value + 1)'));
assert.ok(source.includes('openRequestKey={addMemberMenuRequestId}'));
assert.equal(source.includes("useCommandHandler('team.member.add'"), false);
assert.equal(source.includes('addMemberActionRef'), false);
console.log('TeamPage shortcut navigation: PASS');
