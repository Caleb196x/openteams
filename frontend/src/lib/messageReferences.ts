import type { Message, QuotedMessageReference } from '@/types';

const summarizeMessageContent = (content: string): string => {
  const normalized = content.trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  return normalized.length > 140
    ? `${normalized.slice(0, 137)}...`
    : normalized;
};

const toMessageReference = (message: Message): QuotedMessageReference => {
  const content = message.replyText ?? message.text;
  return {
    id: message.id,
    sender: message.isUser ? 'You' : message.sender,
    content,
    summary: summarizeMessageContent(content),
  };
};

/**
 * Hydrates message-to-message relationships after backend messages are mapped.
 * Explicit user quotes and implicit agent-to-agent source messages are kept
 * separate so the UI can render them with different visual weight.
 */
export const resolveMessageReferences = (messages: Message[]): Message[] => {
  const messagesById = new Map(messages.map((message) => [message.id, message]));

  return messages.map((message) => {
    let resolved = message;

    if (!resolved.quotedMessage && resolved.referenceMessageId) {
      const referenced = messagesById.get(resolved.referenceMessageId);
      if (referenced) {
        resolved = {
          ...resolved,
          quotedMessage: toMessageReference(referenced),
        };
      }
    }

    if (
      !resolved.agentSourceMessage &&
      resolved.isAgent &&
      resolved.sourceMessageId
    ) {
      const source = messagesById.get(resolved.sourceMessageId);
      if (source?.isAgent && source.id !== resolved.id) {
        resolved = {
          ...resolved,
          agentSourceMessage: toMessageReference(source),
        };
      }
    }

    return resolved;
  });
};
