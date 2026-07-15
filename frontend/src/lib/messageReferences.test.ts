import assert from 'node:assert/strict';
import type { Message } from '@/types';
import { resolveMessageReferences } from './messageReferences';

const message = (overrides: Partial<Message>): Message => ({
  id: 'message',
  avatar: 'AG',
  sender: '@agent',
  time: 'just now',
  text: 'message',
  ...overrides,
});

const source = message({
  id: 'source',
  sender: '@backend',
  isAgent: true,
  text: '@frontend Please verify the API contract.',
});
const response = message({
  id: 'response',
  sender: '@frontend',
  isAgent: true,
  sourceMessageId: source.id,
  text: 'The contract is valid.',
});

const resolved = resolveMessageReferences([source, response]);
assert.deepEqual(resolved[1].agentSourceMessage, {
  id: 'source',
  sender: '@backend',
  content: '@frontend Please verify the API contract.',
  summary: '@frontend Please verify the API contract.',
});

const userSource = message({
  id: 'user-source',
  sender: 'You',
  isUser: true,
  text: 'Please implement this.',
});
const userTriggeredResponse = message({
  id: 'user-response',
  isAgent: true,
  sourceMessageId: userSource.id,
});
assert.equal(
  resolveMessageReferences([userSource, userTriggeredResponse])[1]
    .agentSourceMessage,
  undefined,
);

const quoted = message({
  id: 'quoted',
  isAgent: true,
  referenceMessageId: userSource.id,
});
assert.equal(
  resolveMessageReferences([userSource, quoted])[1].quotedMessage?.summary,
  'Please implement this.',
);
