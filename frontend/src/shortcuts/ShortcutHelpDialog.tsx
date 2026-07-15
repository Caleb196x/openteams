import React from 'react';
import { useShortcuts } from './ShortcutProvider';

export function ShortcutHelpDialog() {
  const {
    definitions,
    helpOpen,
    presentationFor,
    setHelpOpen,
  } = useShortcuts();
  if (!helpOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45">
      <div
        data-shortcut-help
        role="dialog"
        aria-modal="true"
        className="max-h-[80vh] w-[min(760px,calc(100vw-32px))] overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-zinc-900"
        onKeyDown={(event) => {
          if (event.key === 'Escape') setHelpOpen(false);
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{presentationFor('shortcuts.help.open').title}</h2>
          <button onClick={() => setHelpOpen(false)} aria-label="Close">×</button>
        </div>
        <div className="grid gap-1">
          {definitions.map((command) => {
            const presentation = presentationFor(command.id);
            return (
              <div
                key={command.id}
                data-command-id={command.id}
                className="flex items-center justify-between border-b border-black/5 py-2 dark:border-white/5"
              >
                <span>{presentation.title}</span>
                <span className="text-xs opacity-70">
                  {presentation.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
