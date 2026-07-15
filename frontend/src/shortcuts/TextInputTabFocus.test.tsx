import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { preventTabFocusChange } from './textInputFocus';

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8');

const chat = readSource('../components/FreeChatWorkspace.tsx');
const sourceControl = readSource(
  '../components/source-control/SessionSourceControlPanel.tsx',
);
const issueDetail = readSource('../pages/IssueDetailPage.tsx');

assert.match(chat, /ref=\{inputRef\}[\s\S]{0,80}tabIndex=\{-1\}/);
assert.match(
  sourceControl,
  /ref=\{commitMessageRef\}[\s\S]{0,80}tabIndex=\{-1\}/,
);
assert.match(
  issueDetail,
  /ref=\{titleInputRef\}[\s\S]{0,80}tabIndex=\{-1\}/,
);
assert.match(
  issueDetail,
  /autoFocus\s+tabIndex=\{-1\}\s+value=\{descriptionDraft\}/,
);
assert.match(
  issueDetail,
  /<textarea\s+tabIndex=\{-1\}\s+value=\{commentText\}/,
);

let prevented = false;
assert.equal(
  preventTabFocusChange({
    key: 'Tab',
    preventDefault: () => {
      prevented = true;
    },
  }),
  true,
);
assert.equal(prevented, true);
assert.equal(
  preventTabFocusChange({
    key: 'Enter',
    preventDefault: () => {
      throw new Error('Non-Tab keys must keep their default behavior');
    },
  }),
  false,
);
assert.ok(chat.includes('if (preventTabFocusChange(e)) return'));
assert.ok(sourceControl.includes('onKeyDown={preventTabFocusChange}'));
assert.equal(
  issueDetail.match(/onKeyDown=\{preventTabFocusChange\}/g)?.length,
  2,
);
assert.ok(issueDetail.includes('if (preventTabFocusChange(event)) return'));

console.log('Text input Tab focus: PASS');
