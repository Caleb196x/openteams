import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('./IssuePage.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('./IssueDetailPage.tsx', import.meta.url), 'utf8');
for (const commandId of [
  'issue.selection.next',
  'issue.selection.previous',
  'issue.selection.open',
]) {
  assert.ok(page.includes(`useCommandHandler('${commandId}'`), commandId);
}
for (const commandId of [
  'issue.detail.back',
  'issue.status.1',
  'issue.status.2',
  'issue.status.3',
  'issue.status.4',
  'issue.status.5',
  'issue.status.6',
  'issue.status.7',
  'issue.status.8',
  'issue.labels.open',
  'issue.session.create',
]) {
  assert.ok(detail.includes(`useCommandHandler('${commandId}'`), commandId);
}
assert.ok(page.includes("useShortcutScope('issue-list'"));
assert.ok(page.includes('active: activeIssue === null'));
assert.ok(page.includes("useShortcutScope('issue-detail'"));
assert.ok(page.includes('active: activeIssue !== null'));
assert.ok(page.includes('data-issue-row-id={issue.id}'));
assert.ok(page.includes('tabIndex={selected ? 0 : -1}'));
assert.ok(page.includes("scrollIntoView({ block:"));
assert.ok(page.includes('focusSelectedOrFirstIssueRow()'));
assert.ok(detail.includes('data-shortcut-focus="issue-detail-heading"'));
assert.ok(detail.includes('headingRef.current?.focus()'));
assert.ok(detail.includes('handleStatusMenuSelect'));
assert.ok(detail.includes("setOpenPropertyMenu('labels')"));
assert.ok(detail.includes('handleOpenCreateSessionDialog'));
assert.equal(
  /document\.addEventListener\('keydown',[\s\S]{0,120}openPropertyMenu/.test(detail),
  false,
);
console.log('Issue shortcuts: PASS');
