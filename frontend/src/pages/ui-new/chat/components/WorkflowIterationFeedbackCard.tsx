import { useEffect, useMemo, useState } from 'react';
import type { WorkflowIterationSummaryData } from '@/lib/api';
import { cn } from '@/lib/utils';

type WorkflowIterationFeedbackPayload = {
  action: 'accept' | 'reject';
  feedback?: {
    what_wrong: string;
    expected: string;
    priority: 'high' | 'medium' | 'low';
    additional_notes?: string;
  };
};

type WorkflowIterationFeedbackCardProps = {
  currentRound: number;
  iterationHistory: WorkflowIterationSummaryData[];
  canReviewCurrentRound?: boolean;
  pendingActionId?: string | null;
  onSubmit?: (payload: WorkflowIterationFeedbackPayload) => void;
};

function roundStatusTone(status: string) {
  switch (status) {
    case 'accepted':
      return 'border-[#86EFAC] bg-[#DCFCE7] text-[#166534]';
    case 'rejected':
      return 'border-[#FCA5A5] bg-[#FEE2E2] text-[#991B1B]';
    case 'running':
      return 'border-[#93C5FD] bg-[#DBEAFE] text-[#1D4ED8]';
    default:
      return 'border-[#CBD5E1] bg-[#F8FAFC] text-[#475569]';
  }
}

export function WorkflowIterationFeedbackCard({
  currentRound,
  iterationHistory,
  canReviewCurrentRound: canReviewCurrentRoundProp = false,
  pendingActionId,
  onSubmit,
}: WorkflowIterationFeedbackCardProps) {
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [expandedReject, setExpandedReject] = useState(false);
  const [whatWrong, setWhatWrong] = useState('');
  const [expected, setExpected] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const orderedHistory = useMemo(
    () => [...iterationHistory].sort((left, right) => right.round_index - left.round_index),
    [iterationHistory]
  );

  useEffect(() => {
    if (orderedHistory.length === 0) {
      setSelectedRound(null);
      return;
    }

    setSelectedRound((previous) => {
      if (
        previous != null &&
        orderedHistory.some((item) => item.round_index === previous)
      ) {
        return previous;
      }
      return orderedHistory[0].round_index;
    });
  }, [orderedHistory]);

  const selectedIteration =
    orderedHistory.find((item) => item.round_index === selectedRound) ?? null;
  const canSubmit = !!onSubmit;
  const disabled = !!pendingActionId;
  const latestIteration = orderedHistory[0] ?? null;
  const canReviewCurrentRound =
    canReviewCurrentRoundProp &&
    currentRound > 0 && latestIteration?.round_index === currentRound;

  const handleAccept = () => {
    setExpandedReject(false);
    setValidationError(null);
    onSubmit?.({ action: 'accept' });
  };

  const handleReject = () => {
    if (!expandedReject) {
      setExpandedReject(true);
      return;
    }

    const nextWhatWrong = whatWrong.trim();
    const nextExpected = expected.trim();
    if (!nextWhatWrong || !nextExpected) {
      setValidationError('Reject 需要填写 what_wrong 和 expected。');
      return;
    }

    setValidationError(null);
    onSubmit?.({
      action: 'reject',
      feedback: {
        what_wrong: nextWhatWrong,
        expected: nextExpected,
        priority,
        additional_notes: additionalNotes.trim() || undefined,
      },
    });
  };

  return (
    <div className="rounded-[24px] border border-[#D8E2F0] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">
          Iteration History
        </span>
        <span className="rounded-full border border-[#BFDBFE] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">
          Current Round {currentRound}
        </span>
      </div>

      {orderedHistory.length > 0 ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {orderedHistory.map((item) => (
              <button
                key={item.round_index}
                type="button"
                onClick={() => setSelectedRound(item.round_index)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  selectedRound === item.round_index
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]'
                    : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'
                )}
              >
                Round {item.round_index}
              </button>
            ))}
          </div>

          {selectedIteration && (
            <div className="mt-3 rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
                    roundStatusTone(selectedIteration.status)
                  )}
                >
                  {selectedIteration.status}
                </span>
              </div>
              {selectedIteration.result_summary && (
                <div className="mt-3 text-sm leading-6 text-[#0F172A]">
                  {selectedIteration.result_summary}
                </div>
              )}
              {selectedIteration.user_feedback && (
                <div className="mt-3 rounded-[16px] border border-[#FCA5A5] bg-white p-3 text-sm leading-6 text-[#991B1B]">
                  {selectedIteration.user_feedback}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 text-sm text-[#64748B]">No iteration history yet.</div>
      )}

      {canReviewCurrentRound && (
        <div className="mt-4 rounded-[20px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#92400E]">
            Current Round Decision
          </div>
          <div className="mt-2 text-sm text-[#475569]">
            Accept the current round or reject it with structured feedback.
          </div>

          {expandedReject && (
            <div className="mt-3 grid gap-3">
              <textarea
                value={whatWrong}
                onChange={(event) => setWhatWrong(event.target.value)}
                rows={3}
                disabled={disabled || !canSubmit}
                placeholder="what_wrong"
                className="w-full resize-y rounded-[16px] border border-[#FCA5A5] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#DC2626] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <textarea
                value={expected}
                onChange={(event) => setExpected(event.target.value)}
                rows={3}
                disabled={disabled || !canSubmit}
                placeholder="expected"
                className="w-full resize-y rounded-[16px] border border-[#FCA5A5] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#DC2626] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as 'high' | 'medium' | 'low')
                }
                disabled={disabled || !canSubmit}
                className="rounded-[16px] border border-[#FCA5A5] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#DC2626] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
              <textarea
                value={additionalNotes}
                onChange={(event) => setAdditionalNotes(event.target.value)}
                rows={2}
                disabled={disabled || !canSubmit}
                placeholder="additional_notes"
                className="w-full resize-y rounded-[16px] border border-[#FCA5A5] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#DC2626] disabled:cursor-not-allowed disabled:opacity-60"
              />
              {validationError && (
                <div className="text-xs text-[#991B1B]">{validationError}</div>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={disabled || !canSubmit}
              className="rounded-full bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={disabled || !canSubmit}
              className="rounded-full border border-[#FCA5A5] bg-white px-3 py-1.5 text-xs font-semibold text-[#991B1B] transition-colors hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {expandedReject ? 'Submit Reject' : 'Reject'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
