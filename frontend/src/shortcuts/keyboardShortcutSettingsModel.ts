import type { CommandDefinition } from './types';

export type ShortcutSettingsFilter =
  | 'all'
  | 'modified'
  | 'conflict'
  | 'unbound';

export type ShortcutSettingsRow = {
  id: string;
  categoryKey: string;
  title: string;
  currentLabel: string;
  defaultLabel: string;
  modified: boolean;
  conflict: boolean;
  unbound: boolean;
};

export function buildShortcutSettingsRows(input: {
  definitions: readonly CommandDefinition[];
  titleFor: (definition: CommandDefinition) => string;
  currentLabelFor: (definition: CommandDefinition) => string;
  defaultLabelFor: (definition: CommandDefinition) => string;
  modifiedCommandIds: ReadonlySet<string>;
  conflictingCommandIds: ReadonlySet<string>;
  unboundCommandIds: ReadonlySet<string>;
}): ShortcutSettingsRow[] {
  return input.definitions.map((definition) => {
    const currentLabel = input.currentLabelFor(definition);
    return {
      id: definition.id,
      categoryKey: definition.categoryKey,
      title: input.titleFor(definition),
      currentLabel,
      defaultLabel: input.defaultLabelFor(definition),
      modified: input.modifiedCommandIds.has(definition.id),
      conflict: input.conflictingCommandIds.has(definition.id),
      unbound: input.unboundCommandIds.has(definition.id),
    };
  });
}

export function filterShortcutSettingsRows(
  rows: readonly ShortcutSettingsRow[],
  input: { query: string; filter: ShortcutSettingsFilter },
) {
  const query = input.query.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    const matchesFilter =
      input.filter === 'all' ||
      (input.filter === 'modified' && row.modified) ||
      (input.filter === 'conflict' && row.conflict) ||
      (input.filter === 'unbound' && row.unbound);
    const haystack = `${row.title} ${row.currentLabel} ${row.defaultLabel}`
      .toLocaleLowerCase();
    return matchesFilter && (!query || haystack.includes(query));
  });
}
