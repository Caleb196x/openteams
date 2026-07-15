import React from 'react';
import { ChordHintOverlay } from './ChordHintOverlay';
import { CommandPalette } from './CommandPalette';
import { ShortcutHelpDialog } from './ShortcutHelpDialog';

export function ShortcutOverlays() {
  return (
    <>
      <CommandPalette />
      <ShortcutHelpDialog />
      <ChordHintOverlay />
    </>
  );
}
