import assert from 'node:assert/strict';
import { getRelativeSessionId } from './sessionNavigation';

const sessions = ['session-a', 'session-b', 'session-c'];

assert.equal(getRelativeSessionId(sessions, 'session-a', 1), 'session-b');
assert.equal(getRelativeSessionId(sessions, 'session-b', -1), 'session-a');
assert.equal(getRelativeSessionId(sessions, 'session-c', 1), 'session-a');
assert.equal(getRelativeSessionId(sessions, 'session-a', -1), 'session-c');
assert.equal(getRelativeSessionId(['session-a'], 'session-a', 1), null);
assert.equal(getRelativeSessionId(sessions, 'missing', 1), null);

console.log('Session navigation: PASS');
