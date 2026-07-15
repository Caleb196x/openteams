import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('./BuildStatsPage.tsx', import.meta.url),
  'utf8',
);
assert.match(
  source,
  /<h1[^>]*tabIndex=\{-1\}[^>]*data-shortcut-focus="build-stats-heading"|<h1[^>]*data-shortcut-focus="build-stats-heading"[^>]*tabIndex=\{-1\}/,
);
console.log('BuildStatsPage shortcut focus: PASS');
