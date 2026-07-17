import assert from 'node:assert/strict';

import { getConflictSpacerLineCounts } from './CodeMirrorConflictEditor';

assert.deepEqual(getConflictSpacerLineCounts('', 'one\ntwo\nthree\n'), {
  current: 3,
  incoming: 0,
});
assert.deepEqual(getConflictSpacerLineCounts('one\n', ''), {
  current: 0,
  incoming: 1,
});
assert.deepEqual(getConflictSpacerLineCounts('one\ntwo\n', 'three\n'), {
  current: 0,
  incoming: 1,
});
assert.deepEqual(getConflictSpacerLineCounts('one\n', 'two\n'), {
  current: 0,
  incoming: 0,
});

console.log('CodeMirrorConflictEditor alignment: PASS');
