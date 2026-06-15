import { AlertTriangle, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export type ConfirmationDialogTone = 'warning' | 'danger';

type ConfirmationDialogProps = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  escLabel: string;
  tone?: ConfirmationDialogTone;
  confirming?: boolean;
  idPrefix?: string;
  confirmIcon?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  escLabel,
  tone = 'warning',
  confirming = false,
  idPrefix = 'confirmation-dialog',
  confirmIcon,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const isDanger = tone === 'danger';
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-desc`;
  const escKey = escLabel.startsWith('Esc') ? 'Esc' : escLabel;
  const escHelp = escLabel.startsWith('Esc') ? escLabel.slice(3).trim() : '';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirming) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirming, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[1002] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label={cancelLabel}
        className="absolute inset-0 bg-black/70 backdrop-blur-xs"
        disabled={confirming}
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-[500px] overflow-hidden rounded-[16px] border border-white/10 bg-[#0c0c0d] font-sans text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_80px_rgba(0,0,0,0.55)] select-none"
        style={{
          fontFamily:
            'Inter, "PingFang SC", "Hiragino Sans GB", "Source Han Sans SC", "Microsoft YaHei", sans-serif',
        }}
      >
        <div className="relative px-8 pb-7 pt-8">
          <div
            className={`mb-5 flex h-8 w-8 items-center justify-center rounded-[8px] ${
              isDanger ? 'bg-[#ff3b30]/10' : 'bg-amber-400/10'
            }`}
          >
            <AlertTriangle
              strokeWidth={1.8}
              className={`h-[18px] w-[18px] ${
                isDanger ? 'text-[#ff6b72]' : 'text-amber-400'
              }`}
            />
          </div>
          <div className="min-w-0">
            <p
              id={titleId}
              className="text-[18px] font-semibold leading-[1.2] text-white"
            >
              {title}
            </p>
            <div
              id={descriptionId}
              className="mt-3 text-[13px] leading-[1.55] text-[#8a8a8e]"
            >
              {description}
            </div>
          </div>
          <button
            type="button"
            disabled={confirming}
            onClick={onCancel}
            className="absolute right-6 top-6 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/35 transition hover:bg-white/[0.04] hover:text-white/60 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={cancelLabel}
            title={cancelLabel}
          >
            <X className="h-[13px] w-[13px]" strokeWidth={1.6} />
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#111112] px-8 py-4">
          <span className="flex items-center gap-2 text-[12px] text-[#63666d]">
            <kbd className="rounded-[5px] border border-white/[0.08] bg-white/[0.035] px-1.5 py-0.5 font-mono text-[10px] leading-none text-[#8a8a8e] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {escKey}
            </kbd>
            {escHelp && <span>{escHelp}</span>}
          </span>
          <div className="flex gap-2.5">
            <button
              type="button"
              className="h-9 cursor-pointer rounded-[8px] border border-white/[0.08] bg-white/[0.025] px-4 text-[13px] font-medium text-[#a0a0a6] transition hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={confirming}
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border px-4 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 ${
                isDanger
                  ? 'border-[#ff8a80]/20 bg-[#d64b42] hover:bg-[#e0574f]'
                  : 'border-white/10 bg-[var(--primary)] hover:bg-[var(--primary-hover)]'
              }`}
              disabled={confirming}
              onClick={onConfirm}
            >
              {confirmIcon}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
