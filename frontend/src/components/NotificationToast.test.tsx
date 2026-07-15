// Run with:
//   pnpm exec tsx src/components/NotificationToast.test.tsx

import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  NotificationToast,
  type NotificationToastTone,
} from './NotificationToast';

const expectedIconClass: Record<NotificationToastTone, string> = {
  info: 'lucide-info',
  success: 'lucide-circle-check',
  warning: 'lucide-triangle-alert',
  error: 'lucide-circle-x',
};

for (const [tone, iconClass] of Object.entries(expectedIconClass) as Array<
  [NotificationToastTone, string]
>) {
  const markup = renderToStaticMarkup(
    <NotificationToast message={`${tone} message`} tone={tone} />,
  );

  assert.match(markup, new RegExp(`class="[^"]*${iconClass}`));
}

console.log('Notification toast icons: PASS');
