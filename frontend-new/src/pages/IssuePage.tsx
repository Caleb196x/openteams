import React from 'react';
import { FileText } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';

export function IssuePage() {
  const { t } = useWorkspace();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface-2)] text-[var(--ink)]">
      <header className="shrink-0 border-b border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-4 md:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[var(--hairline)] bg-[var(--surface-1)] text-[var(--primary)]">
              <FileText aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold leading-[1.15] tracking-[-0.4px] text-[var(--ink)]">
                {t('page.issue')}
              </h1>
              <p className="mt-1 max-w-[560px] text-[14px] leading-[1.45] text-[var(--ink-subtle)]">
                {t('sidebar.nav.project-issue.helper')}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <section className="flex h-full min-h-0 items-center justify-center rounded-[8px] border border-[var(--hairline)] bg-[var(--surface-1)] p-6 text-center text-[14px] text-[var(--ink-subtle)]">
          {t('sidebar.nav.project-issue.helper')}
        </section>
      </div>
    </div>
  );
}
