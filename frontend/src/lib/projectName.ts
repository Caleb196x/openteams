export const sanitizeProjectName = (value: string): string =>
  value.replace(/[^\p{L}\p{N}]/gu, '');
