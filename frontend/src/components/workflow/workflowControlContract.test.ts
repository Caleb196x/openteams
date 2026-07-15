import assert from 'node:assert/strict';
import type { WorkflowCardData } from '@/lib/api';
import {
  canPauseWorkflowExecution,
  canResumeWorkflowExecution,
} from './workflowControlContract';

const projection = (execution_status: string, stopped_by_user: boolean) =>
  ({ execution_status, stopped_by_user }) satisfies Pick<
    WorkflowCardData,
    'execution_status' | 'stopped_by_user'
  >;

assert.equal(canPauseWorkflowExecution(projection('running', false)), true);
assert.equal(canPauseWorkflowExecution(projection('failed', false)), false);
assert.equal(canResumeWorkflowExecution(projection('paused', false)), true);
assert.equal(canResumeWorkflowExecution(projection('failed', false)), true);
assert.equal(canResumeWorkflowExecution(projection('failed', true)), false);
assert.equal(canResumeWorkflowExecution(projection('running', false)), false);
console.log('workflowControlContract stop semantics: PASS');
