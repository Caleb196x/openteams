// Smoke tests for project name normalization.
//
// Run with:
//     pnpm exec tsx src/lib/projectName.test.ts

import assert from 'node:assert/strict';
import { sanitizeProjectName } from './projectName';

assert.equal(sanitizeProjectName(' My 项目 - 01! '), 'My项目01');
assert.equal(sanitizeProjectName('___---!!!'), '');
assert.equal(sanitizeProjectName('OpenTeams2026'), 'OpenTeams2026');

// eslint-disable-next-line no-console
console.log('Project name normalization checks passed.');
