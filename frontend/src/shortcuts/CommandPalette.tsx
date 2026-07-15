import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useShortcuts } from './ShortcutProvider';

export function CommandPalette() {
  const {
    definitions,
    executeCommand,
    paletteOpen,
    presentationFor,
    setPaletteOpen,
  } = useShortcuts();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!paletteOpen) return;
    setQuery('');
    queueMicrotask(() => inputRef.current?.focus());
  }, [paletteOpen]);
  const commands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return definitions.filter((command) => {
      if (!normalized) return true;
      const presentation = presentationFor(command.id);
      return `${presentation.title} ${presentation.label}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [definitions, presentationFor, query]);
  if (!paletteOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex justify-center bg-black/45 pt-[12vh]">
      <div
        data-command-palette
        role="dialog"
        aria-modal="true"
        className="max-h-[70vh] w-[min(640px,calc(100vw-32px))] overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900"
      >
        <input
          ref={inputRef}
          data-command-search
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setPaletteOpen(false);
          }}
          placeholder={presentationFor('commandPalette.open').title}
          className="w-full border-b border-black/10 bg-transparent px-4 py-3 outline-none dark:border-white/10"
        />
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {commands.map((command) => {
            const presentation = presentationFor(command.id);
            return (
              <button
                key={command.id}
                data-command-id={command.id}
                disabled={Boolean(presentation.disabledReason)}
                onClick={() => {
                  void executeCommand(command.id).then((executed) => {
                    if (executed) setPaletteOpen(false);
                  });
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/5"
              >
                <span>{presentation.title}</span>
                <span className="text-xs opacity-60">
                  {presentation.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
