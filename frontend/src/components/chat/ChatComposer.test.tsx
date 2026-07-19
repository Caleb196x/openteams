import { readFileSync } from 'node:fs';

let failures = 0;
const check = (label: string, condition: boolean, detail?: unknown) => {
  if (condition) {
    console.log(`  ok  ${label}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${label}`, detail ?? '');
};

console.log('ChatComposer');

const composerSource = readFileSync(
  new URL('./ChatComposer.tsx', import.meta.url),
  'utf8',
);
const workspaceSource = readFileSync(
  new URL('../FreeChatWorkspace.tsx', import.meta.url),
  'utf8',
);

check(
  'owns input state outside the message workspace',
  composerSource.includes("const [inputText, setInputText] = useState(") &&
    composerSource.includes('export const ChatComposer = memo(') &&
    workspaceSource.includes('<ChatComposer') &&
    !workspaceSource.includes('const [inputText, setInputText]'),
  { composerSource, workspaceSource },
);

check(
  'keeps drafts scoped by session id',
  composerSource.includes('const sessionDraftCache = new Map<string, string>()') &&
    composerSource.includes('sessionDraftCache.get(sessionId)') &&
    composerSource.includes('sessionDraftCache.set(sessionId, nextText)') &&
    composerSource.includes('sessionDraftCache.delete(sessionId)'),
  composerSource,
);

check(
  'does not clear a newer session after an old submission completes',
  composerSource.includes('const sessionIdRef = useRef(sessionId)') &&
    composerSource.includes('const submissionIdRef = useRef(0)') &&
    composerSource.includes('submittedSessionId !== sessionIdRef.current') &&
    composerSource.includes('submissionId === submissionIdRef.current'),
  composerSource,
);

check(
  'clears only accepted submissions',
  composerSource.includes("result !== 'accepted'") &&
    composerSource.includes("setDraft('')") &&
    composerSource.includes('setFiles([])') &&
    composerSource.includes('onCancelQuote()'),
  composerSource,
);

check(
  'preserves unicode mention insertion and keyboard selection',
  composerSource.includes('/@[\\p{L}\\p{N}_-]*$/u') &&
    composerSource.includes("event.key === 'ArrowDown'") &&
    composerSource.includes("event.key === 'ArrowUp'") &&
    composerSource.includes('insertMemberMention(member)'),
  composerSource,
);

check(
  'owns prefill focus and textarea resizing',
  composerSource.includes('CHAT_INPUT_PREFILL_EVENT') &&
    composerSource.includes('readChatInputPrefill(sessionId)') &&
    composerSource.includes('textareaRef.current?.focus()') &&
    composerSource.includes('setSelectionRange(') &&
    composerSource.includes('resizeChatTextarea(textareaRef.current)'),
  composerSource,
);

check(
  'keeps the chat shortcut scope with the textarea',
  composerSource.includes("useShortcutScope('chat-composer'") &&
    composerSource.includes("useCommandHandler('session.plan-mode.toggle'") &&
    composerSource.includes('target === textareaRef.current'),
  composerSource,
);

if (failures > 0) {
  console.error(`${failures} ChatComposer assertion(s) failed.`);
  process.exitCode = 1;
}
