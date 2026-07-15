import type { SourceControlDiffArea } from '@/types';

export const sourceControlSelectionKey = (
  area: SourceControlDiffArea,
  path: string,
): string => `${area}:${path}`;
