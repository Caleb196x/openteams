import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./WorkflowWindow.tsx', import.meta.url), 'utf8');
for (const commandId of [
  'workflow.review.select-approve',
  'workflow.review.select-reject',
  'workflow.review.confirm',
]) {
  assert.ok(source.includes(`useCommandHandler('${commandId}'`), commandId);
}
const approveBlock = source.slice(source.indexOf("useCommandHandler('workflow.review.select-approve'"));
assert.ok(approveBlock.slice(0, approveBlock.indexOf('});') + 3).includes('setReviewSelection'));
assert.equal(approveBlock.slice(0, approveBlock.indexOf('});') + 3).includes('onRespondPendingReview'), false);
const rejectBlock = source.slice(source.indexOf("useCommandHandler('workflow.review.select-reject'"));
assert.ok(rejectBlock.slice(0, rejectBlock.indexOf('});') + 3).includes('setReviewSelection'));
assert.equal(rejectBlock.slice(0, rejectBlock.indexOf('});') + 3).includes('onRespondPendingReview'), false);
const confirmBlock = source.slice(source.indexOf("useCommandHandler('workflow.review.confirm'"));
assert.ok(confirmBlock.slice(0, confirmBlock.indexOf('});') + 3).includes('onRespondPendingReview'));
assert.ok(source.includes("useShortcutScope('workflow-review'"));
assert.ok(source.includes('active: hasPendingReview && !pendingAction'));
assert.ok(source.includes("useShortcutScope('workflow-preview'"));
assert.ok(source.includes('active: isPreview'));
assert.ok(source.includes("useShortcutScope('workflow-running'"));
assert.ok(source.includes("active: !isPreview && projection.execution_status === 'running'"));
assert.ok(source.includes('setReviewSelection(null)'));
console.log('Workflow two-stage review shortcuts: PASS');
