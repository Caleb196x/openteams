import { useMemo, useState } from 'react';
import type { WorkflowPendingReviewData } from '@/lib/api';

type WorkflowPendingReviewCardProps = {
  pendingReview: WorkflowPendingReviewData;
  pendingActionId?: string | null;
  onSubmit?: (action: 'approve' | 'reject', feedback?: string) => void;
};

function getReviewTypeLabel(reviewType: string) {
  switch (reviewType) {
    case 'step_user_review':
      return 'Step Review';
    case 'loop_user_review':
      return 'Loop Review';
    case 'iteration_acceptance':
      return 'Final Review';
    default:
      return reviewType;
  }
}

export function WorkflowPendingReviewCard({
  pendingReview,
  pendingActionId,
  onSubmit,
}: WorkflowPendingReviewCardProps) {
  const [expandedReject, setExpandedReject] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const feedbackField = useMemo(
    () =>
      pendingReview.prompt_template.fields.find(
        (field) => field.key === 'feedback' || field.field_type === 'textarea'
      ) ?? null,
    [pendingReview.prompt_template.fields]
  );
  const disabled = pendingActionId === pendingReview.review_id;

  const handleApprove = () => {
    setExpandedReject(false);
    setValidationError(null);
    onSubmit?.('approve');
  };

  const handleReject = () => {
    if (!expandedReject) {
      setExpandedReject(true);
      return;
    }

    const trimmedFeedback = feedback.trim();
    if (!trimmedFeedback) {
      setValidationError('Reject 需要填写反馈意见。');
      return;
    }

    setValidationError(null);
    onSubmit?.('reject', trimmedFeedback);
  };

  return (
    <div className="rounded-[24px] border border-[#FCD34D] bg-[#FFFBEB] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#92400E]">
          Pending Review
        </span>
        <span className="rounded-full border border-[#FDE68A] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#B45309]">
          {getReviewTypeLabel(pendingReview.review_type)}
        </span>
        <span className="rounded-full border border-[#FDE68A] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#92400E]">
          {pendingReview.target_title}
        </span>
      </div>

      <div className="mt-3 text-sm font-semibold text-[#0F172A]">
        {pendingReview.prompt_template.message || '请审核当前结果。'}
      </div>

      <div className="mt-3 rounded-[18px] border border-[#FDE68A] bg-white/80 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#92400E]">
          Context Summary
        </div>
        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#475569]">
          {pendingReview.context_summary}
        </div>
      </div>

      {expandedReject && (
        <div className="mt-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#991B1B]">
            {feedbackField?.label ?? 'Feedback'}
          </div>
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            rows={4}
            disabled={disabled}
            placeholder={feedbackField?.placeholder ?? '请填写具体修改意见'}
            className="mt-2 w-full resize-y rounded-[18px] border border-[#FCA5A5] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#DC2626] disabled:cursor-not-allowed disabled:opacity-60"
          />
          {validationError && (
            <div className="mt-2 text-xs text-[#991B1B]">{validationError}</div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={disabled || !onSubmit}
          className="rounded-full bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={disabled || !onSubmit}
          className="rounded-full border border-[#FCA5A5] bg-white px-3 py-1.5 text-xs font-semibold text-[#991B1B] transition-colors hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {expandedReject ? 'Submit Reject' : 'Reject'}
        </button>
      </div>
    </div>
  );
}
