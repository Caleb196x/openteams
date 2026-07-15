import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  ISSUE_NAVIGATION_EVENT,
  clearIssueNavigationTarget,
  readIssueNavigationTarget,
  requestIssueNavigation,
} from './issueNavigation';

const dom = new JSDOM('<!doctype html>', { url: 'http://localhost' });
Object.assign(globalThis, {
  window: dom.window,
  CustomEvent: dom.window.CustomEvent,
});
const seen: unknown[] = [];
window.addEventListener(ISSUE_NAVIGATION_EVENT, (event) => {
  seen.push((event as CustomEvent).detail);
});
for (const target of [
  { kind: 'list' as const, projectId: 'project-1' },
  { kind: 'create' as const, projectId: 'project-1' },
  {
    kind: 'detail' as const,
    projectId: 'project-1',
    workItemId: 'issue-1',
  },
]) {
  requestIssueNavigation(target);
  assert.deepEqual(readIssueNavigationTarget(), target);
}
assert.deepEqual(seen, [
  { kind: 'list', projectId: 'project-1' },
  { kind: 'create', projectId: 'project-1' },
  { kind: 'detail', projectId: 'project-1', workItemId: 'issue-1' },
]);
clearIssueNavigationTarget();
assert.equal(readIssueNavigationTarget(), null);
console.log('issueNavigation: PASS');
