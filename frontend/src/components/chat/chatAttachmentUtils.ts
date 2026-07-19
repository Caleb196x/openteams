import type { ChatAttachment } from '@/types';

const allowedTextAttachmentExtensions = [
  '.txt',
  '.csv',
  '.md',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.rb',
  '.php',
  '.go',
  '.rs',
  '.sql',
  '.sh',
  '.bash',
  '.svg',
];

const allowedImageAttachmentExtensions = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
];

const allowedAttachmentExtensions = [
  ...allowedTextAttachmentExtensions,
  ...allowedImageAttachmentExtensions,
];

export const CHAT_ATTACHMENT_ACCEPT = [
  'text/*',
  'image/*',
  ...allowedAttachmentExtensions,
].join(',');

export const isImageAttachment = (file: File) =>
  file.type.startsWith('image/') ||
  allowedImageAttachmentExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );

const isTextAttachment = (file: File) =>
  file.type.startsWith('text/') ||
  allowedTextAttachmentExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );

export const isAllowedAttachment = (file: File) =>
  isImageAttachment(file) || isTextAttachment(file);

export const isImageChatAttachment = (attachment: ChatAttachment) =>
  attachment.kind === 'image' ||
  attachment.mime_type?.startsWith('image/') ||
  allowedImageAttachmentExtensions.some((ext) =>
    attachment.name.toLowerCase().endsWith(ext),
  );

const fallbackClipboardFileName = (file: File, index: number) => {
  if (file.name.trim()) return file.name;

  const extension = file.type.startsWith('image/')
    ? (file.type.split('/')[1] ?? 'png')
    : file.type === 'text/plain'
      ? 'txt'
      : 'dat';

  return `pasted-attachment-${Date.now()}-${index + 1}.${extension}`;
};

const normalizeClipboardFile = (file: File, index: number) =>
  file.name.trim()
    ? file
    : new File([file], fallbackClipboardFileName(file, index), {
        type: file.type,
        lastModified: file.lastModified || Date.now(),
      });

export const getClipboardFiles = (clipboardData: DataTransfer): File[] => {
  const itemFiles = Array.from(clipboardData.items)
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));

  const files =
    itemFiles.length > 0 ? itemFiles : Array.from(clipboardData.files);

  return files.map(normalizeClipboardFile);
};

export const attachmentIdentity = (file: File) =>
  `${file.name}:${file.size}:${file.lastModified}`;

export const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};
