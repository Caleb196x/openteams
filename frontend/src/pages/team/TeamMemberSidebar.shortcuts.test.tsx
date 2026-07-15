import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./TeamMemberSidebar.tsx', import.meta.url), 'utf8');
assert.ok(source.includes('const searchInputRef = useRef<HTMLInputElement>(null)'));
assert.ok(source.includes('previousOpenRequestKeyRef.current === openRequestKey'));
assert.ok(source.includes('setShowAddMenu(true)'));
assert.ok(source.includes('searchInputRef.current?.focus()'));
assert.ok(source.includes("searchInputRef.current?.scrollIntoView({ block: 'nearest'"));
assert.ok(source.includes('ref={searchInputRef}'));
console.log('TeamMemberSidebar shortcut focus: PASS');
