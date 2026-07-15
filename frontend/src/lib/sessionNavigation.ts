export const getRelativeSessionId = (
  orderedSessionIds: readonly string[],
  activeSessionId: string | null,
  offset: -1 | 1,
): string | null => {
  if (!activeSessionId || orderedSessionIds.length < 2) return null;

  const activeIndex = orderedSessionIds.indexOf(activeSessionId);
  if (activeIndex < 0) return null;

  const nextIndex =
    (activeIndex + offset + orderedSessionIds.length) % orderedSessionIds.length;
  return orderedSessionIds[nextIndex] ?? null;
};
