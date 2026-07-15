import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('./ProjectSidebar.tsx', import.meta.url),
  'utf8',
);
assert.ok(source.includes("useCommandHandler('project.create'"));
assert.ok(source.includes('resetProjectForm();'));
assert.ok(source.includes('setCreateFormOpen(true);'));
assert.ok(source.includes('closeProjectMenus();'));
const handler = source.slice(
  source.indexOf("useCommandHandler('project.create'"),
);
assert.equal(
  handler.slice(0, handler.indexOf('});') + 3).includes('handleCreateProject'),
  false,
);
assert.ok(source.includes('commandId="project.create"'));
console.log('ProjectSidebar shortcuts: PASS');
