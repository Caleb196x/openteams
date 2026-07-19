import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ArrowUp,
  AtSign,
  ChevronDown,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Lock,
  Mic,
  Paperclip,
  Plus,
  Quote,
  X,
} from 'lucide-react';

import { ResourceStateNotice } from '@/components/ResourceState';
import { CommandTooltip } from '@/shortcuts/CommandTooltip';
import {
  useCommandHandler,
  useShortcutScope,
} from '@/shortcuts/ShortcutProvider';
import { preventTabFocusChange } from '@/shortcuts/textInputFocus';
import {
  CHAT_INPUT_PREFILL_EVENT,
  clearChatInputPrefill,
  readChatInputPrefill,
  type ChatInputPrefillDetail,
  type ChatInputPrefillMode,
} from '@/lib/chatInputPrefill';
import type { AsyncResourceState } from '@/lib/asyncResource';
import type { Member, QuotedMessageReference } from '@/types';
import {
  CHAT_ATTACHMENT_ACCEPT,
  attachmentIdentity,
  formatFileSize,
  getClipboardFiles,
  isAllowedAttachment,
  isImageAttachment,
} from './chatAttachmentUtils';

const CHAT_INPUT_SHELL_MIN_HEIGHT = 95;
const CHAT_INPUT_MIN_HEIGHT = 30;
const CHAT_INPUT_SHELL_MAX_HEIGHT = Math.round(
  CHAT_INPUT_SHELL_MIN_HEIGHT * 2.5,
);
const CHAT_INPUT_STATIC_CHROME_HEIGHT =
  CHAT_INPUT_SHELL_MIN_HEIGHT - CHAT_INPUT_MIN_HEIGHT;
const CHAT_INPUT_MAX_HEIGHT =
  CHAT_INPUT_SHELL_MAX_HEIGHT - CHAT_INPUT_STATIC_CHROME_HEIGHT;

const sessionDraftCache = new Map<string, string>();

const resizeChatTextarea = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) return;
  textarea.style.height = `${CHAT_INPUT_MIN_HEIGHT}px`;
  const target = Math.min(
    Math.max(textarea.scrollHeight, CHAT_INPUT_MIN_HEIGHT),
    CHAT_INPUT_MAX_HEIGHT,
  );
  textarea.style.height = `${target}px`;
};

export type ChatComposerSubmit = {
  sessionId: string;
  text: string;
  files: File[];
  quotedMessageId?: string;
  inputMode: ChatInputPrefillMode;
};

export type ChatComposerSubmitResult = 'accepted' | 'rejected';

interface ChatComposerProps {
  sessionId: string;
  members: Member[];
  membersAsync: AsyncResourceState<Member[]>;
  quotedMessage: QuotedMessageReference | null;
  inputMode: ChatInputPrefillMode;
  mainAgentName: string;
  apiAvailable: boolean;
  focusRequestKey: number;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  onRetryMembers: () => void;
  onInputModeChange: (mode: ChatInputPrefillMode) => void;
  onCancelQuote: () => void;
  onShowToast: (message: string) => void;
  onSubmit: (
    payload: ChatComposerSubmit,
  ) => Promise<ChatComposerSubmitResult>;
}

const ChatComposerComponent: React.FC<ChatComposerProps> = ({
  sessionId,
  members,
  membersAsync,
  quotedMessage,
  inputMode,
  mainAgentName,
  apiAvailable,
  focusRequestKey,
  t,
  onRetryMembers,
  onInputModeChange,
  onCancelQuote,
  onShowToast,
  onSubmit,
}) => {
  const [inputText, setInputText] = useState(
    () => sessionDraftCache.get(sessionId) ?? '',
  );
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false);
  const [activeMemberPickerIndex, setActiveMemberPickerIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const memberPickerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(sessionId);
  const submissionIdRef = useRef(0);
  sessionIdRef.current = sessionId;

  const setDraft = useCallback(
    (nextText: string) => {
      setInputText(nextText);
      if (nextText.length > 0) {
        sessionDraftCache.set(sessionId, nextText);
      } else {
        sessionDraftCache.delete(sessionId);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    submissionIdRef.current += 1;
    setInputText(sessionDraftCache.get(sessionId) ?? '');
    setFiles([]);
    setIsSubmitting(false);
    setIsMemberPickerOpen(false);
    setActiveMemberPickerIndex(0);
  }, [sessionId]);

  useEffect(() => {
    resizeChatTextarea(textareaRef.current);
  }, [inputText]);

  useEffect(() => {
    if (focusRequestKey <= 0) return;
    textareaRef.current?.focus();
  }, [focusRequestKey]);

  useEffect(() => {
    if (inputMode === 'workflow') setIsMemberPickerOpen(false);
  }, [inputMode]);

  useEffect(() => {
    if (!isMemberPickerOpen) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !memberPickerRef.current?.contains(target)
      ) {
        setIsMemberPickerOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () =>
      document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [isMemberPickerOpen]);

  useEffect(() => {
    if (activeMemberPickerIndex >= members.length) {
      setActiveMemberPickerIndex(Math.max(0, members.length - 1));
    }
  }, [activeMemberPickerIndex, members.length]);

  const applyChatInputPrefill = useCallback(
    (detail: ChatInputPrefillDetail) => {
      if (!detail || detail.sessionId !== sessionId) return false;

      setDraft(detail.text);
      setFiles([]);
      setIsMemberPickerOpen(false);
      setActiveMemberPickerIndex(0);
      onCancelQuote();

      const focusComposer = () => {
        if (detail.mode) onInputModeChange(detail.mode);
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          detail.text.length,
          detail.text.length,
        );
        resizeChatTextarea(textareaRef.current);
        clearChatInputPrefill(detail.sessionId);
      };

      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(focusComposer);
      } else {
        focusComposer();
      }
      return true;
    },
    [onCancelQuote, onInputModeChange, sessionId, setDraft],
  );

  useEffect(() => {
    const pending = readChatInputPrefill(sessionId);
    if (pending) applyChatInputPrefill(pending);
  }, [applyChatInputPrefill, sessionId]);

  useEffect(() => {
    const handleChatInputPrefill = (event: Event) => {
      applyChatInputPrefill(
        (event as CustomEvent<ChatInputPrefillDetail>).detail,
      );
    };
    window.addEventListener(CHAT_INPUT_PREFILL_EVENT, handleChatInputPrefill);
    return () =>
      window.removeEventListener(
        CHAT_INPUT_PREFILL_EVENT,
        handleChatInputPrefill,
      );
  }, [applyChatInputPrefill]);

  const toggleInputMode = useCallback(() => {
    onInputModeChange(inputMode === 'workflow' ? 'free' : 'workflow');
  }, [inputMode, onInputModeChange]);

  useShortcutScope('chat-composer', {
    active: Boolean(sessionId),
    rootRef: textareaRef,
  });
  useCommandHandler('session.plan-mode.toggle', {
    scope: 'focused-component',
    enabled: Boolean(sessionId),
    allowInEditable: true,
    ownsEventTarget: (target) => target === textareaRef.current,
    execute: toggleInputMode,
  });

  const addFiles = (incoming: FileList | File[]) => {
    if (!apiAvailable) {
      onShowToast(t('attachment.requiresApi'));
      return;
    }

    const list = Array.from(incoming);
    if (list.length === 0) return;
    const allowedFiles = list.filter((file) => isAllowedAttachment(file));
    const rejectedCount = list.length - allowedFiles.length;
    if (rejectedCount > 0) {
      onShowToast(t('attachment.unsupported', { count: rejectedCount }));
    }
    if (allowedFiles.length === 0) return;

    setFiles((current) => {
      const existing = new Set(current.map(attachmentIdentity));
      const next = [...current];
      for (const file of allowedFiles) {
        const identity = attachmentIdentity(file);
        if (!existing.has(identity)) {
          existing.add(identity);
          next.push(file);
        }
      }
      return next;
    });
  };

  const insertMemberMention = (member: Member) => {
    const handle = member.name.startsWith('@') ? member.name : `@${member.name}`;
    const input = textareaRef.current;
    const currentValue = input?.value ?? inputText;
    const cursorStart = input?.selectionStart ?? currentValue.length;
    const cursorEnd = input?.selectionEnd ?? cursorStart;
    const beforeCursor = currentValue.slice(0, cursorStart);
    const tokenMatch = beforeCursor.match(/@[\p{L}\p{N}_-]*$/u);
    const replaceStart = tokenMatch
      ? cursorStart - tokenMatch[0].length
      : cursorStart;
    const prefix = currentValue.slice(0, replaceStart);
    const suffix = currentValue.slice(cursorEnd);
    const leadingSpace =
      replaceStart === 0 || /\s$/.test(prefix) ? '' : ' ';
    const trailingSpace = suffix.length === 0 || /^\s/.test(suffix) ? ' ' : ' ';
    const inserted = `${leadingSpace}${handle}${trailingSpace}`;
    const nextValue = `${prefix}${inserted}${suffix}`;
    const nextCursor = prefix.length + inserted.length;

    setDraft(nextValue);
    setIsMemberPickerOpen(false);
    setActiveMemberPickerIndex(0);

    const restoreCursor = () => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    };
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(restoreCursor);
    } else {
      restoreCursor();
    }
  };

  const submit = async () => {
    if (isSubmitting || (!inputText.trim() && files.length === 0)) return;
    const submittedSessionId = sessionId;
    const submissionId = submissionIdRef.current + 1;
    submissionIdRef.current = submissionId;
    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        sessionId,
        text: inputText,
        files: [...files],
        quotedMessageId: quotedMessage?.id,
        inputMode,
      });
      if (
        result !== 'accepted' ||
        submittedSessionId !== sessionIdRef.current
      ) {
        return;
      }
      setDraft('');
      setFiles([]);
      onCancelQuote();
    } finally {
      if (submissionId === submissionIdRef.current) setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Tab' && event.shiftKey) return;
    if (preventTabFocusChange(event)) return;

    if (isMemberPickerOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveMemberPickerIndex((current) =>
          members.length === 0 ? 0 : (current + 1) % members.length,
        );
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveMemberPickerIndex((current) =>
          members.length === 0
            ? 0
            : (current - 1 + members.length) % members.length,
        );
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const member = members[activeMemberPickerIndex] ?? members[0];
        if (member) insertMemberMention(member);
        else setIsMemberPickerOpen(false);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMemberPickerOpen(false);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const isPlanMode = inputMode === 'workflow';
  const canSend =
    (Boolean(inputText.trim()) || files.length > 0) && !isSubmitting;
  const freeModePlaceholder = t('discussPlaceholder', {
    agent: mainAgentName,
  });

  return (
    <div className="shrink-0 pt-4 pb-0">
      {quotedMessage && (
        <div className="mb-2 flex items-start gap-2 rounded-md border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[11px] text-[var(--ink-muted)]">
          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-tertiary)]" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-[var(--ink)]">
              {t('message.quotePrefix', { sender: quotedMessage.sender })}
            </div>
            <div className="truncate font-mono text-[10px] text-[var(--ink-tertiary)]">
              {quotedMessage.summary}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelQuote}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--ink-tertiary)] transition hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
            title={t('message.dismissQuote')}
            aria-label={t('message.dismissQuote')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, index) => {
            const AttachmentIcon = isImageAttachment(file)
              ? ImageIcon
              : FileText;
            return (
              <div
                key={`${attachmentIdentity(file)}:${index}`}
                className="flex max-w-full items-center gap-2 rounded-md border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[11px] text-[var(--ink-muted)]"
              >
                <AttachmentIcon className="h-3.5 w-3.5 shrink-0 text-[var(--ink-tertiary)]" />
                <span
                  className="max-w-[180px] truncate font-medium text-[var(--ink)]"
                  title={file.name}
                >
                  {file.name}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--ink-tertiary)]">
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--ink-tertiary)] transition hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
                  title={t('attachment.remove')}
                  aria-label={t('attachment.remove')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div
        onClick={() => textareaRef.current?.focus()}
        className={`relative rounded-md border border-[var(--hairline-strong)] bg-[var(--surface-1)] focus-within:border-[var(--primary)] p-3.5 transition-all flex flex-col gap-3 min-h-[95px] ${
          isPlanMode ? 'plan-mode-input-active' : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={CHAT_ATTACHMENT_ACCEPT}
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <textarea
          ref={textareaRef}
          tabIndex={-1}
          rows={1}
          className="w-full bg-transparent resize-none border-none text-[16px] leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--ink-tertiary)] select-text overflow-y-auto md:text-[13px] md:leading-normal"
          style={{
            minHeight: CHAT_INPUT_MIN_HEIGHT,
            maxHeight: CHAT_INPUT_MAX_HEIGHT,
          }}
          value={inputText}
          onChange={(event) => {
            const nextValue = event.target.value;
            const cursor = event.target.selectionStart ?? nextValue.length;
            setDraft(nextValue);
            resizeChatTextarea(event.target);
            if (cursor > 0 && nextValue[cursor - 1] === '@') {
              setIsMemberPickerOpen(true);
              setActiveMemberPickerIndex(0);
            }
          }}
          onKeyDown={handleKeyDown}
          onPaste={(event) => {
            const pastedFiles = getClipboardFiles(event.clipboardData);
            if (pastedFiles.length === 0) return;
            event.preventDefault();
            addFiles(pastedFiles);
          }}
          onClick={(event) => event.stopPropagation()}
          placeholder={
            isPlanMode
              ? t('planModePlaceholder', { agent: mainAgentName })
              : freeModePlaceholder
          }
        />

        <div className="flex flex-wrap items-center justify-between pt-1 shrink-0 gap-2 select-none">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!apiAvailable) {
                  onShowToast(t('attachment.requiresApi'));
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={isSubmitting}
              className="p-1 rounded-full hover:bg-[var(--surface-3)] text-[var(--ink-subtle)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              title={t('uploadFile')}
              aria-label={t('uploadFile')}
            >
              {files.length > 0 ? (
                <Paperclip className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>

            <CommandTooltip commandId="session.plan-mode.toggle">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleInputMode();
                }}
                className={`plan-mode-toggle flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition cursor-pointer ${
                  isPlanMode
                    ? 'plan-mode-toggle-active border-[var(--primary)] bg-[var(--primary-tint)] text-[var(--primary)]'
                    : 'border-[var(--hairline)] bg-[var(--surface-2)] text-[var(--ink-muted)] hover:bg-[var(--surface-3)]'
                }`}
                aria-pressed={isPlanMode}
                aria-label={
                  isPlanMode ? t('switchToChatMode') : t('switchToPlanMode')
                }
              >
                <GitBranch className="h-3 w-3" />
                <span>{t('planMode')}</span>
              </button>
            </CommandTooltip>
          </div>

          <div className="flex items-center gap-2">
            {isPlanMode ? (
              <div
                className="flex max-w-[180px] items-center gap-1.5 rounded-md border border-[var(--hairline)] bg-[var(--surface-2)] px-2 py-1 font-mono text-[11px] font-medium text-[var(--ink-muted)]"
                title={t('fixedMainAgentMention', { agent: mainAgentName })}
                aria-label={t('fixedMainAgentMention', {
                  agent: mainAgentName,
                })}
              >
                <span className="truncate">{mainAgentName}</span>
                <Lock className="h-3 w-3 shrink-0 opacity-70" />
              </div>
            ) : (
              <div ref={memberPickerRef} className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsMemberPickerOpen((current) => !current);
                  }}
                  className="flex items-center gap-1.5 bg-[var(--surface-2)] border border-[var(--hairline)] px-2 py-1 rounded-md text-[11px] text-[var(--ink-muted)] font-mono hover:bg-[var(--surface-3)] cursor-pointer"
                  title={t('inThisSession')}
                >
                  <AtSign className="h-3.5 w-3.5 text-[var(--ink-tertiary)]" />
                  <ChevronDown className="h-3 w-3 text-[var(--ink-tertiary)]" />
                </button>

                {isMemberPickerOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-56 rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-3)] p-1 z-20">
                    <div className="px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--ink-tertiary)]">
                      {t('inThisSession')}
                    </div>
                    <ResourceStateNotice
                      resource={membersAsync}
                      labels={{
                        loading: t('resource.members.loading'),
                        empty: t('resource.members.empty'),
                        error: t('resource.members.error'),
                        fallback: t('resource.members.fallback'),
                      }}
                      onRetry={onRetryMembers}
                      compact
                      className="mb-1"
                    />
                    {members.length === 0 ? (
                      <div className="px-2 py-2 text-[10px] text-[var(--ink-tertiary)]">
                        {t('noSessionMembers')}
                      </div>
                    ) : (
                      members.map((member, index) => (
                        <button
                          key={member.id}
                          type="button"
                          aria-selected={index === activeMemberPickerIndex}
                          onMouseEnter={() => setActiveMemberPickerIndex(index)}
                          onClick={(event) => {
                            event.stopPropagation();
                            insertMemberMention(member);
                          }}
                          className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left cursor-pointer ${
                            index === activeMemberPickerIndex
                              ? 'bg-[color-mix(in_srgb,var(--primary)_24%,var(--surface-3))] ring-1 ring-inset ring-[color-mix(in_srgb,var(--primary)_48%,transparent)]'
                              : 'hover:bg-[color-mix(in_srgb,var(--primary)_12%,var(--surface-3))]'
                          }`}
                        >
                          <span className="h-5 w-5 rounded-full bg-[var(--mono-bg)] border border-[var(--mono-border)] flex items-center justify-center text-[8px] font-mono font-semibold text-[var(--ink-muted)]">
                            {member.avatar}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-semibold text-[var(--ink)]">
                              {member.name}
                            </span>
                            <span className="block truncate text-[9px] font-mono text-[var(--ink-tertiary)]">
                              {member.roleDetail}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => onShowToast(t('toast.voiceReady'))}
              className="p-1 rounded-full hover:bg-[var(--surface-2)] text-[var(--ink-subtle)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              title={t('voiceInput')}
            >
              <Mic className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSend}
              className={`p-1.5 rounded-full transition-all flex items-center justify-center shrink-0 ${
                canSend
                  ? 'bg-[var(--primary)] text-white hover:opacity-95 cursor-pointer hover:scale-105'
                  : 'bg-[var(--surface-3)] text-[var(--ink-tertiary)] cursor-not-allowed'
              }`}
              title={isSubmitting ? t('attachment.uploading') : undefined}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatComposer = memo(ChatComposerComponent);
