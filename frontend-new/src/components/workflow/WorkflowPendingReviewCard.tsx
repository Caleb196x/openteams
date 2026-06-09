import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { WorkflowPendingReviewData } from '@/lib/api';
import { localizeWorkflowGeneratedText } from './workflowGeneratedText';

type WorkflowPendingReviewCardProps = {
  pendingReview: WorkflowPendingReviewData;
  pendingActionId?: string | null;
  onSubmit?: (action: 'approve' | 'reject', feedback?: string) => void;
};

function getReviewTypeLabel(
  reviewType: string,
  t: (key: string, opts?: Record<string, unknown>) => string
) {
  switch (reviewType) {
    case 'step_user_review':
      return t('workflow.pendingReview.reviewTypes.stepReview', {
        defaultValue: 'Step Review',
      });
    case 'loop_user_review':
      return t('workflow.pendingReview.reviewTypes.loopReview', {
        defaultValue: 'Loop Review',
      });
    case 'iteration_acceptance':
      return t('workflow.pendingReview.reviewTypes.finalReview', {
        defaultValue: 'Final Review',
      });
    default:
      return reviewType;
  }
}

export function WorkflowPendingReviewCard({
  pendingReview,
  pendingActionId,
  onSubmit,
}: WorkflowPendingReviewCardProps) {
  const { t } = useTranslation('chat');
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
  const reviewMessage = pendingReview.prompt_template.message
    ? localizeWorkflowGeneratedText(pendingReview.prompt_template.message, t)
    : t('workflow.pendingReview.defaultMessage', {
        defaultValue: 'Please review the current result.',
      });
  const feedbackLabel =
    feedbackField?.key === 'feedback'
      ? t('workflow.pendingReview.feedbackLabel', {
          defaultValue: 'Feedback',
        })
      : feedbackField?.label
        ? localizeWorkflowGeneratedText(feedbackField.label, t)
        : t('workflow.pendingReview.feedbackLabel', {
            defaultValue: 'Feedback',
          });
  const feedbackPlaceholder =
    feedbackField?.key === 'feedback'
      ? t('workflow.pendingReview.feedbackPlaceholder', {
          defaultValue: 'Please provide specific revision comments',
        })
      : feedbackField?.placeholder
        ? localizeWorkflowGeneratedText(feedbackField.placeholder, t)
        : t('workflow.pendingReview.feedbackPlaceholder', {
            defaultValue: 'Please provide specific revision comments',
          });

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
      setValidationError(
        t('workflow.pendingReview.validationError', {
          defaultValue: 'Reject requires feedback.',
        })
      );
      return;
    }

    setValidationError(null);
    onSubmit?.('reject', trimmedFeedback);
  };

  return (
    <div className="workflow-pending-review-card rounded-[0_12px_12px_0] border border-[var(--hairline)] border-l-2 border-l-[var(--primary)] bg-[var(--surface-1)] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
        <AlertCircle className="w-4 h-4" />
        {t('workflow.pendingReview.title', { defaultValue: 'Pending Review' })}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[var(--hairline)] bg-[var(--primary-tint)] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--primary)]">
          {getReviewTypeLabel(pendingReview.review_type, t)}
        </span>
        <span className="rounded-full border border-[var(--hairline)] bg-[var(--surface-2)] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--ink-subtle)]">
          {pendingReview.target_title}
        </span>
      </div>

      <p className="mb-3 text-[11px] font-medium leading-relaxed text-[var(--ink-muted)]">
        {reviewMessage}
      </p>

      {pendingReview.context_summary && (
        <div className="mb-3 rounded-lg border border-[var(--hairline)] bg-[var(--surface-2)] p-3">
          <div className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--ink-tertiary)]">
            {t('workflow.pendingReview.context', { defaultValue: 'Context' })}
          </div>
          <div className="whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--ink-muted)]">
            {localizeWorkflowGeneratedText(pendingReview.context_summary, t)}
          </div>
        </div>
      )}

      {expandedReject && (
        <div className="mb-3">
          <div className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--workflow-danger,#ef4444)]">
            {feedbackLabel}
          </div>
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            rows={3}
            disabled={disabled}
            placeholder={feedbackPlaceholder}
            className="w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-tertiary)] focus:border-[var(--primary)] focus:outline-2 focus:outline-[color-mix(in_srgb,var(--primary-focus)_48%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
          />
          {validationError && (
            <div className="mt-1 text-[10px] text-[var(--workflow-danger,#ef4444)]">
              {validationError}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={disabled || !onSubmit}
          className="flex-1 rounded-lg bg-[var(--success)] py-1.5 font-mono text-[10px] font-medium text-[var(--on-primary)] transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('workflow.pendingReview.approve', { defaultValue: 'APPROVE' })}
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={disabled || !onSubmit}
          className={`flex-1 rounded-lg py-1.5 font-mono text-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            expandedReject
              ? 'border border-[color-mix(in_srgb,var(--workflow-danger,#ef4444)_30%,var(--hairline))] bg-[color-mix(in_srgb,var(--workflow-danger,#ef4444)_10%,var(--surface-1))] text-[var(--workflow-danger,#ef4444)]'
              : 'border border-[var(--hairline)] bg-[var(--surface-2)] text-[var(--ink-muted)] hover:bg-[var(--surface-3)]'
          }`}
        >
          {expandedReject
            ? t('workflow.pendingReview.submitReject', {
                defaultValue: 'SUBMIT REJECT',
              })
            : t('workflow.pendingReview.reject', { defaultValue: 'REJECT' })}
        </button>
      </div>
    </div>
  );
}
