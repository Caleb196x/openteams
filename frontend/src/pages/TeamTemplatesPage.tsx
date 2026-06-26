import {
  ArrowLeft,
  Box,
  ChevronRight,
  Pencil,
  Plus,
  Save,
  Settings,
  PenTool,
  Telescope,
  Terminal,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { teamPresetsApi } from "@/lib/api";
import type {
  ChatMemberPreset,
  CreateTeamPresetRequest,
  JsonValue,
  TeamPresetDetail,
  TeamPresetSummary,
  UpdateTeamPresetRequest,
} from "../../../shared/types";

type TranslateFn = (
  key: string,
  replacements?: Record<string, string | number>,
) => string;

type MemberForm = {
  id: string;
  name: string;
  description: string;
  runnerType: string;
  recommendedModel: string;
  systemPrompt: string;
  selectedSkillIdsText: string;
};

type TeamPresetForm = {
  id: string;
  name: string;
  description: string;
  leadMemberId: string;
  teamProtocol: string;
  enabled: boolean;
  members: MemberForm[];
};

type EditorMode = "create" | "edit" | null;

const blankMember = (index: number): MemberForm => ({
  id: index === 0 ? "lead" : `member_${index + 1}`,
  name: index === 0 ? "Lead" : `Member ${index + 1}`,
  description: "",
  runnerType: "",
  recommendedModel: "",
  systemPrompt: "",
  selectedSkillIdsText: "",
});

const blankForm = (): TeamPresetForm => ({
  id: "custom_team",
  name: "",
  description: "",
  leadMemberId: "lead",
  teamProtocol: "",
  enabled: true,
  members: [blankMember(0)],
});

const detailToForm = (detail: TeamPresetDetail): TeamPresetForm => ({
  id: detail.team.id,
  name: detail.team.name,
  description: detail.team.description || "",
  leadMemberId: detail.team.lead_member_id ?? "",
  teamProtocol: detail.team.team_protocol || "",
  enabled: detail.team.enabled,
  members: detail.members.map((member) => ({
    id: member.id,
    name: member.name,
    description: member.description || "",
    runnerType: member.runner_type ?? "",
    recommendedModel: member.recommended_model ?? "",
    systemPrompt: member.system_prompt || "",
    selectedSkillIdsText: member.selected_skill_ids.join(", "),
  })),
});

const parseSkillIds = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const formToPayload = (
  form: TeamPresetForm,
): CreateTeamPresetRequest | UpdateTeamPresetRequest => ({
  team: {
    id: form.id.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    member_ids: form.members.map((member) => member.id.trim()).filter(Boolean),
    lead_member_id: form.leadMemberId.trim() || null,
    team_protocol: form.teamProtocol.trim() || null,
    enabled: form.enabled,
  },
  members: form.members.map((member) => ({
    id: member.id.trim(),
    name: member.name.trim(),
    description: member.description.trim() || null,
    runner_type: member.runnerType.trim() || null,
    recommended_model: member.recommendedModel.trim() || null,
    system_prompt: member.systemPrompt.trim() || null,
    default_workspace_path: null,
    selected_skill_ids: parseSkillIds(member.selectedSkillIdsText),
    tools_enabled: null as JsonValue | null,
    enabled: true,
  })),
});

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

type ScenarioCategory = "开发" | "设计" | "科研" | "调研";

type WorkflowStepPreview = {
  title: string;
  description: string;
};

type TeamTemplatePresentation = {
  categories: ScenarioCategory[];
  workflow: WorkflowStepPreview[];
};

const scenarioBadgeClassName =
  "inline-flex items-center gap-1.5 rounded-full border border-[var(--team-template-border)] bg-transparent px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--team-template-aux)]";

const memberAvatarClassName =
  "border border-[var(--team-template-border)] bg-[var(--team-template-surface)] font-mono text-[var(--team-template-title)] shadow-[inset_0_1px_0_var(--team-template-top-highlight)]";

const hairlineSurfaceClassName =
  "relative overflow-hidden border border-[var(--team-template-border)] bg-[var(--team-template-surface)] shadow-[inset_0_1px_0_var(--team-template-top-highlight)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[var(--team-template-top-glow)]";

const interactiveSurfaceClassName =
  "transition-all duration-200 ease-out hover:-translate-y-px hover:border-[var(--team-template-border-strong)] hover:bg-[var(--team-template-surface-hover)] hover:shadow-[inset_0_1px_0_var(--team-template-top-highlight-strong),0_3px_10px_rgba(0,0,0,0.12)]";

const quietButtonClassName =
  `inline-flex items-center justify-center rounded-md ${hairlineSurfaceClassName} text-[var(--team-template-title)] ${interactiveSurfaceClassName}`;

const activeSurfaceClassName =
  "border border-[var(--team-template-border-strong)] bg-[var(--team-template-active-surface)] shadow-[inset_0_1px_0_var(--team-template-top-highlight-strong),0_3px_10px_rgba(0,0,0,0.12)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[var(--team-template-top-glow)]";

const recommendedBadgeClassName =
  "inline-flex text-[11px] font-semibold text-[var(--team-template-accent)] [text-shadow:0_0_10px_var(--team-template-accent-glow)]";

const categoryDotClassName: Record<ScenarioCategory, string> = {
  开发: "bg-[#4DAAFB] shadow-[0_0_8px_rgba(77,170,251,0.32)]",
  设计: "bg-[#FF8A65] shadow-[0_0_8px_rgba(255,138,101,0.28)]",
  科研: "bg-[#5DE4A7] shadow-[0_0_8px_rgba(93,228,167,0.26)]",
  调研: "bg-[#C4A7FF] shadow-[0_0_8px_rgba(196,167,255,0.24)]",
};

const defaultTemplatePresentation: TeamTemplatePresentation = {
  categories: ["开发"],
  workflow: [
    {
      title: "目标澄清",
      description: "确认输入、约束和交付标准。",
    },
    {
      title: "分工执行",
      description: "成员按角色推进任务并同步状态。",
    },
    {
      title: "复审交付",
      description: "汇总结果、检查风险并形成交付物。",
    },
  ],
};

const templatePresentationById: Record<string, TeamTemplatePresentation> = {
  "advanced-release-command": {
    categories: ["开发"],
    workflow: [
      {
        title: "版本范围",
        description: "确认变更、风险和发布窗口。",
      },
      {
        title: "质量校验",
        description: "执行 QA、回归检查和阻塞项整理。",
      },
      {
        title: "发布叙事",
        description: "生成 release notes 与用户沟通材料。",
      },
      {
        title: "上线复盘",
        description: "跟踪信号、缺陷和后续行动。",
      },
    ],
  },
  "advanced-growth-ops": {
    categories: ["调研"],
    workflow: [
      {
        title: "假设收集",
        description: "梳理实验目标、用户洞察和核心指标。",
      },
      {
        title: "实验设计",
        description: "确定变量、样本和成功判定方式。",
      },
      {
        title: "数据解读",
        description: "分析漏斗变化和显著性风险。",
      },
      {
        title: "决策建议",
        description: "沉淀结论并规划下一轮动作。",
      },
    ],
  },
};

const getTemplatePresentation = (teamId: string): TeamTemplatePresentation =>
  templatePresentationById[teamId] ?? defaultTemplatePresentation;

const getCategoryIcon = (category?: ScenarioCategory): typeof Box => {
  switch (category) {
    case "开发":
      return Terminal;
    case "设计":
      return PenTool;
    case "科研":
    case "调研":
      return Telescope;
    default:
      return Box;
  }
};

const advancedTeamTemplates: TeamPresetSummary[] = [
  {
    id: "advanced-release-command",
    name: "Release command center",
    description:
      "Coordinate release notes, QA checks, rollout signals, and post-launch follow-up.",
    member_ids: ["release_lead", "qa_reviewer", "growth_writer"],
    lead_member_id: "release_lead",
    team_protocol: "Mock professional release workflow placeholder.",
    is_builtin: true,
    enabled: true,
    member_count: 3,
    members: [],
  },
  {
    id: "advanced-growth-ops",
    name: "Growth operations",
    description:
      "Plan experiments, analyze funnel deltas, and prepare weekly growth decisions.",
    member_ids: ["growth_lead", "analytics", "copywriter"],
    lead_member_id: "growth_lead",
    team_protocol: "Mock professional growth workflow placeholder.",
    is_builtin: true,
    enabled: true,
    member_count: 3,
    members: [],
  },
];

const createMockMemberPreset = (
  id: string,
  name: string,
  description: string,
  selectedSkillIds: string[],
): ChatMemberPreset => ({
  id,
  name,
  description,
  runner_type: null,
  recommended_model: null,
  system_prompt: description,
  default_workspace_path: null,
  selected_skill_ids: selectedSkillIds,
  tools_enabled: null as JsonValue,
  is_builtin: true,
  enabled: true,
});

const mockTeamTemplateDetails: Record<string, TeamPresetDetail> = {
  "advanced-release-command": {
    team: {
      id: "advanced-release-command",
      name: "Release command center",
      description:
        "Coordinate release notes, QA checks, rollout signals, and post-launch follow-up.",
      member_ids: ["release_lead", "qa_reviewer", "growth_writer"],
      lead_member_id: "release_lead",
      team_protocol: "Release lead coordinates scope, QA signs off blockers, and growth writer prepares launch communication.",
      is_builtin: true,
      enabled: true,
    },
    members: [
      createMockMemberPreset("release_lead", "Release lead", "Owns release scope, risk triage, and final go/no-go framing.", ["planning", "source-control"]),
      createMockMemberPreset("qa_reviewer", "QA reviewer", "Checks regression risk, verifies acceptance criteria, and records blockers.", ["review", "testing"]),
      createMockMemberPreset("growth_writer", "Growth writer", "Turns release details into clear user-facing updates and follow-up notes.", ["writing", "launch"]),
    ],
  },
  "advanced-growth-ops": {
    team: {
      id: "advanced-growth-ops",
      name: "Growth operations",
      description:
        "Plan experiments, analyze funnel deltas, and prepare weekly growth decisions.",
      member_ids: ["growth_lead", "analytics", "copywriter"],
      lead_member_id: "growth_lead",
      team_protocol: "Growth lead frames the hypothesis, analytics validates results, and copywriter prepares experiment messaging.",
      is_builtin: true,
      enabled: true,
    },
    members: [
      createMockMemberPreset("growth_lead", "Growth lead", "Defines experiment goals, prioritizes opportunities, and keeps the weekly decision loop tight.", ["planning", "metrics"]),
      createMockMemberPreset("analytics", "Analytics", "Reads funnel movement, checks data quality, and summarizes decision confidence.", ["analysis", "research"]),
      createMockMemberPreset("copywriter", "Copywriter", "Drafts experiment variants, messaging angles, and post-test recommendations.", ["writing", "experiments"]),
    ],
  },
};

function TeamTemplatesHeader({
  onCreate,
  t,
}: {
  onCreate: () => void;
  t: TranslateFn;
}) {
  const systemBreadcrumbLabel = t("agents.breadcrumb.system");

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--team-template-border)] bg-transparent px-6 shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)]">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1.5"
      >
        <span
          role="img"
          aria-label={systemBreadcrumbLabel}
          title={systemBreadcrumbLabel}
          className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--team-template-muted)]"
        >
          <Settings aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={1.5} />
        </span>
        <ChevronRight
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-[var(--team-template-border-strong)]"
          strokeWidth={1.5}
        />
        <h1 className="truncate text-[13px] font-medium leading-none text-[var(--team-template-title)]">
          {t("page.team-templates")}
        </h1>
      </nav>

      <button
        type="button"
        onClick={onCreate}
        className={`${quietButtonClassName} h-[28px] gap-1.5 px-3 text-[12px] font-medium hover:text-white`}
      >
        <Plus aria-hidden="true" className="h-3.5 w-3.5 -ml-0.5" strokeWidth={1.5} />
        新建模板
      </button>
    </header>
  );
}

function FormInput({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-[var(--team-template-muted)]">
        {label}
      </span>
      <input
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="team-template-field mt-1.5 h-8 w-full rounded-md border border-[var(--team-template-border)] bg-[var(--team-template-surface)] px-3 text-[13px] text-[var(--team-template-title)] shadow-[inset_0_1px_0_var(--team-template-top-highlight)] outline-none transition-colors duration-150 placeholder:text-[var(--team-template-muted)] focus:border-[var(--team-template-border-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function FormTextarea({
  label,
  onChange,
  rows = 3,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-[var(--team-template-muted)]">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="team-template-field mt-1.5 w-full resize-y rounded-md border border-[var(--team-template-border)] bg-[var(--team-template-surface)] px-3 py-2 text-[13px] leading-relaxed text-[var(--team-template-title)] shadow-[inset_0_1px_0_var(--team-template-top-highlight)] outline-none transition-colors duration-150 placeholder:text-[var(--team-template-muted)] focus:border-[var(--team-template-border-strong)]"
      />
    </label>
  );
}

function TemplateEditor({
  form,
  formError,
  mode,
  saving,
  onCancel,
  onChange,
  onSave,
}: {
  form: TeamPresetForm;
  formError: string | null;
  mode: Exclude<EditorMode, null>;
  saving: boolean;
  onCancel: () => void;
  onChange: (form: TeamPresetForm) => void;
  onSave: () => void;
}) {
  const updateMember = (index: number, patch: Partial<MemberForm>) => {
    const members = form.members.map((member, memberIndex) =>
      memberIndex === index ? { ...member, ...patch } : member,
    );
    onChange({
      ...form,
      leadMemberId:
        form.leadMemberId &&
        members.some((member) => member.id === form.leadMemberId)
          ? form.leadMemberId
          : members[0]?.id ?? "",
      members,
    });
  };

  const removeMember = (index: number) => {
    const members = form.members.filter(
      (_, memberIndex) => memberIndex !== index,
    );
    onChange({
      ...form,
      members,
      leadMemberId:
        members.find((member) => member.id === form.leadMemberId)?.id ??
        members[0]?.id ??
        "",
    });
  };

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <section className={`rounded-lg ${hairlineSurfaceClassName}`}>
        <header className="flex h-14 items-center justify-between border-b border-[var(--team-template-border)] px-6">
          <h2 className="text-[14px] font-medium text-[var(--team-template-title)]">
            {mode === "create" ? "New custom template" : "Edit template"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--team-template-muted)] transition-colors duration-150 hover:bg-[var(--team-template-surface-hover)] hover:text-[var(--team-template-title)] disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        <div className="space-y-6 p-6">
          {formError && (
            <div className="rounded-md bg-red-500/10 px-4 py-3 text-[13px] text-red-500 border border-red-500/20">
              {formError}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <FormInput
              disabled={mode === "edit"}
              label="Template ID"
              value={form.id}
              onChange={(id) => onChange({ ...form, id })}
            />
            <FormInput
              label="Name"
              value={form.name}
              onChange={(name) => onChange({ ...form, name })}
            />
          </div>
          <FormTextarea
            label="Description"
            value={form.description}
            onChange={(description) => onChange({ ...form, description })}
          />
          <FormTextarea
            label="Team protocol"
            value={form.teamProtocol}
            onChange={(teamProtocol) => onChange({ ...form, teamProtocol })}
          />
          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[var(--team-template-title)]">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) =>
                onChange({ ...form, enabled: event.target.checked })
              }
              className="h-4 w-4 rounded border-[var(--team-template-border-strong)] bg-[var(--team-template-surface)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            Enabled in picker
          </label>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-t border-[var(--team-template-border)] pt-8">
              <h3 className="text-[14px] font-medium text-[var(--team-template-title)]">
                Members
              </h3>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...form,
                    members: [...form.members, blankMember(form.members.length)],
                  })
                }
                className={`${quietButtonClassName} h-8 gap-1.5 px-3 text-[13px] font-medium`}
              >
                <Plus aria-hidden="true" className="-ml-0.5 h-4 w-4 text-[var(--team-template-muted)]" strokeWidth={1.5} />
                Add member
              </button>
            </div>

            {form.members.map((member, index) => (
              <section
                key={`${member.id}-${index}`}
                className={`rounded-lg p-5 ${hairlineSurfaceClassName}`}
              >
                <div className="mb-5 flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[var(--team-template-title)]">
                    <input
                      type="radio"
                      checked={form.leadMemberId === member.id}
                      onChange={() =>
                        onChange({ ...form, leadMemberId: member.id })
                      }
                      className="h-4 w-4 border-[var(--team-template-border-strong)] bg-[var(--team-template-surface)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    Lead member
                  </label>
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    disabled={form.members.length === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--team-template-muted)] transition-colors duration-150 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                    aria-label="Remove member"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <FormInput
                    label="Member ID"
                    value={member.id}
                    onChange={(id) => updateMember(index, { id })}
                  />
                  <FormInput
                    label="Name"
                    value={member.name}
                    onChange={(name) => updateMember(index, { name })}
                  />
                  <FormInput
                    label="Executor"
                    value={member.runnerType}
                    onChange={(runnerType) => updateMember(index, { runnerType })}
                  />
                  <FormInput
                    label="Recommended model"
                    value={member.recommendedModel}
                    onChange={(recommendedModel) =>
                      updateMember(index, { recommendedModel })
                    }
                  />
                </div>
                <div className="mt-5 space-y-5">
                  <FormInput
                    label="Skill IDs (comma separated)"
                    value={member.selectedSkillIdsText}
                    onChange={(selectedSkillIdsText) =>
                      updateMember(index, { selectedSkillIdsText })
                    }
                  />
                  <FormTextarea
                    label="Description"
                    value={member.description}
                    onChange={(description) => updateMember(index, { description })}
                  />
                  <FormTextarea
                    label="System prompt"
                    rows={5}
                    value={member.systemPrompt}
                    onChange={(systemPrompt) =>
                      updateMember(index, { systemPrompt })
                    }
                  />
                </div>
              </section>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[var(--team-template-border)] pt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className={`${quietButtonClassName} h-9 px-4 text-[13px] font-medium disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-[#ededed] px-5 text-[13px] font-medium text-[#08090a] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-all duration-150 ease-out hover:-translate-y-px hover:bg-white disabled:opacity-60"
            >
              <Save aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {saving ? "Saving..." : "Save template"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ScenarioBadges({ categories }: { categories: ScenarioCategory[] }) {
  const visibleCategories = categories.slice(0, 1);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleCategories.map((category) => (
        <span
          key={category}
          className={scenarioBadgeClassName}
          data-category={category}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${categoryDotClassName[category]}`}
          />
          {category}
        </span>
      ))}
    </div>
  );
}

function RecommendedBadge() {
  return (
    <span className={recommendedBadgeClassName}>
      推荐
    </span>
  );
}

function WorkflowPreview({ steps }: { steps: WorkflowStepPreview[] }) {
  return (
    <section className="mt-12 border-t border-[var(--team-template-border)] pt-8">
      <h2 className="mb-4 text-sm font-semibold text-[var(--team-template-title)]">
        工作流程
      </h2>
      <div className="flex flex-col md:flex-row md:items-stretch">
        {steps.map((step, index) => (
          <div key={`${step.title}-${index}`} className="contents">
            <div className={`flex min-w-0 flex-1 flex-col rounded-lg p-5 ${hairlineSurfaceClassName}`}>
              <div className="flex items-center gap-2">
                <span className="rounded border border-[var(--team-template-border)] bg-[var(--team-template-tag-surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--team-template-title)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-sm font-medium text-[var(--team-template-title)]">
                  {step.title}
                </h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--team-template-muted)]">
                {step.description}
              </p>
            </div>
            {index < steps.length - 1 && (
              <>
                <div className="mx-auto h-4 w-px bg-[var(--team-template-border)] md:hidden" />
                <div className="hidden w-8 items-center md:flex">
                  <div className="h-px w-full bg-[var(--team-template-border)]" />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TemplateDetailView({
  canEdit,
  detail,
  detailError,
  detailLoading,
  onBack,
  onDelete,
  onEdit,
  onRetryDetail,
}: {
  canEdit: boolean;
  detail: TeamPresetDetail | null;
  detailError: string | null;
  detailLoading: boolean;
  onBack: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onRetryDetail: () => void;
}) {
  if (detailLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6 md:p-8 animate-pulse">
        <div className="mb-8 h-6 w-32 rounded bg-[var(--team-template-surface-hover)]"></div>
        <div className="flex gap-5">
           <div className="h-16 w-16 rounded-lg bg-[var(--team-template-surface-hover)]"></div>
           <div className="flex-1 space-y-3 pt-2">
             <div className="h-8 w-64 rounded bg-[var(--team-template-surface-hover)]"></div>
             <div className="h-4 w-full max-w-2xl rounded bg-[var(--team-template-surface)]"></div>
             <div className="h-4 w-96 rounded bg-[var(--team-template-surface)]"></div>
           </div>
        </div>
      </div>
    );
  }

  if (detailError || !detail) {
    return (
      <div className="mx-auto max-w-5xl p-6 md:p-8 text-center pt-24">
        <h2 className="text-[16px] font-medium text-[var(--team-template-title)]">
          Could not load template details
        </h2>
        <p className="mt-2 text-[14px] text-[var(--team-template-muted)]">
          {detailError || "Unknown error occurred."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onBack}
            className={`${quietButtonClassName} px-4 py-2 text-[13px] font-medium`}
          >
            Back to list
          </button>
          <button
            onClick={onRetryDetail}
            className="rounded-md border border-white/10 bg-[#ededed] px-4 py-2 text-[13px] font-medium text-[#08090a] transition-all duration-150 hover:-translate-y-px hover:bg-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const presentation = getTemplatePresentation(detail.team.id);
  const DetailCategoryIcon = getCategoryIcon(presentation.categories[0]);

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-[13px] font-medium text-[var(--team-template-muted)] transition-colors duration-150 hover:text-[var(--team-template-title)]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> 返回
      </button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start gap-5">
           <div className="flex h-14 w-10 shrink-0 items-center justify-center text-[var(--team-template-icon-strong)]">
              <DetailCategoryIcon className="h-6 w-6" strokeWidth={1.5} />
           </div>
           <div>
             <div className="flex items-center gap-3">
               <h1 className="text-2xl font-semibold tracking-normal text-[var(--team-template-title)]">{detail.team.name}</h1>
               {detail.team.is_builtin && (
                 <RecommendedBadge />
               )}
             </div>
             <div className="mt-2">
               <ScenarioBadges categories={presentation.categories} />
             </div>
             <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--team-template-muted)]">
               {detail.team.description || "No description provided for this template."}
             </p>
           </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {canEdit && (
            <>
              <button onClick={onEdit} className={`${quietButtonClassName} gap-2 px-4 py-2 text-sm font-medium`}>
                <Pencil aria-hidden="true" className="h-3.5 w-3.5 text-[var(--team-template-muted)]" strokeWidth={1.5} />
                编辑模板
              </button>
              <button onClick={onDelete} className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-red-300 ${hairlineSurfaceClassName} transition-all duration-150 ease-out hover:-translate-y-px hover:border-red-400/30 hover:bg-red-500/10`}>
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} />
                删除
              </button>
            </>
          )}
          <button className="rounded-md border border-white/10 bg-[#ededed] px-4 py-2 text-sm font-medium text-[#08090a] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-all duration-150 ease-out hover:-translate-y-px hover:bg-white">
            使用此模板
          </button>
        </div>
      </div>

      <WorkflowPreview steps={presentation.workflow} />

      <div className="mt-12">
        <h2 className="mb-4 text-sm font-semibold text-[var(--team-template-title)]">
          包含以下成员 (<span className="font-mono text-[13px] tabular-nums">{detail.members.length}</span>)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {detail.members.map((member) => (
            <div key={member.id} className={`team-template-member-row flex items-start gap-4 rounded-lg p-4 ${hairlineSurfaceClassName}`}>
                 <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium ${memberAvatarClassName}`}>
                    {member.name.slice(0, 2).toUpperCase()}
                 </div>
                 <div className="min-w-0 flex-1">
                   <div className="flex items-center gap-2">
                     <h3 className="truncate text-sm font-medium text-[var(--team-template-title)]">{member.name}</h3>
                     {member.id === detail.team.lead_member_id && (
                       <span className="shrink-0 rounded-full border border-[var(--team-template-border)] bg-transparent px-2 py-0.5 text-[10px] font-medium text-[var(--team-template-title)]">
                         Lead
                       </span>
                     )}
                   </div>
                   
                   {member.selected_skill_ids.length > 0 && (
                     <div className="mt-2 flex flex-wrap gap-1.5">
                       {member.selected_skill_ids.map((skill) => (
                         <span key={skill} className="rounded-full border border-[var(--team-template-border)] bg-[var(--team-template-tag-surface)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--team-template-muted)]">
                           {skill}
                         </span>
                       ))}
                     </div>
                   )}
                   
                   <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[var(--team-template-muted)]">
                     {member.description || member.system_prompt || "No role description."}
                   </p>
                 </div>
            </div>
          ))}
        </div>
      </div>
      
      {detail.team.team_protocol && (
        <div className="mt-12 border-t border-[var(--team-template-border)] pt-8">
           <h2 className="mb-4 text-sm font-semibold text-[var(--team-template-title)]">协作协议 (Team Protocol)</h2>
           <div className={`whitespace-pre-wrap rounded-lg p-6 font-mono text-[13px] leading-relaxed text-[var(--team-template-title)] ${hairlineSurfaceClassName}`}>
             {detail.team.team_protocol}
           </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: TeamPresetSummary;
  onClick: () => void;
}) {
  const presentation = getTemplatePresentation(template.id);
  const CategoryIcon = getCategoryIcon(presentation.categories[0]);
  
  return (
    <div
      onClick={onClick}
      className={`team-template-card group relative flex cursor-pointer flex-col gap-2 rounded-lg p-3 ${hairlineSurfaceClassName} ${interactiveSurfaceClassName}`}
    >
      {template.is_builtin && (
        <div className="absolute right-3 top-3">
          <RecommendedBadge />
        </div>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-3 pr-12">
        <div className="flex h-8 w-6 shrink-0 items-center justify-center text-[var(--team-template-icon-strong)] transition-colors duration-150 ease-out group-hover:text-[var(--team-template-title)]">
          <CategoryIcon className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <h3 className="min-w-0 truncate text-sm font-semibold leading-snug text-[var(--team-template-title)]">
          {template.name}
        </h3>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <ScenarioBadges categories={presentation.categories} />
        </div>
        <div className="flex shrink-0 items-center font-mono text-[11px] font-medium text-[var(--team-template-aux)] tabular-nums">
          <Users className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
          <span>{template.member_count}</span>
          <span className="ml-0.5">成员</span>
        </div>
      </div>
    </div>
  );
}

export function TeamTemplatesPage() {
  const { t } = useWorkspace();
  const [templates, setTemplates] = useState<TeamPresetSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TeamPresetDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [form, setForm] = useState<TeamPresetForm>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await teamPresetsApi.list();
      setTemplates(response.teams);
    } catch (error) {
      setLoadError(errorText(error, "Failed to load templates."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (teamId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const mockDetail = mockTeamTemplateDetails[teamId];
      if (mockDetail) {
        setSelectedDetail(mockDetail);
        return;
      }
      const detail = await teamPresetsApi.get(teamId);
      setSelectedDetail(detail);
    } catch (error) {
      setDetailError(errorText(error, "Failed to load template details."));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  const myTeamTemplates = useMemo(() => templates, [templates]);
  const canEditSelected = Boolean(
    selectedDetail && !selectedDetail.team.is_builtin,
  );

  const startCreate = () => {
    setForm(blankForm());
    setFormError(null);
    setEditorMode("create");
    setSelectedId(null);
  };

  const startEdit = () => {
    if (!selectedDetail || selectedDetail.team.is_builtin) return;
    setForm(detailToForm(selectedDetail));
    setFormError(null);
    setEditorMode("edit");
  };

  const saveTemplate = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = formToPayload(form);
      const saved =
        editorMode === "create"
          ? await teamPresetsApi.create(payload)
          : await teamPresetsApi.update(form.id, payload);
      setEditorMode(null);
      await loadTemplates();
      setSelectedId(saved.team.id);
    } catch (error) {
      const errorMessage = errorText(error, "Failed to save template.");
      setFormError(errorMessage);
      return;
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (!selectedDetail || selectedDetail.team.is_builtin || deleting) return;
    const confirmed = window.confirm(
      `Delete "${selectedDetail.team.name}"? This removes the custom template and any private members only used by it.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await teamPresetsApi.delete(selectedDetail.team.id);
      setSelectedDetail(null);
      setSelectedId(null);
      await loadTemplates();
    } catch (error) {
      setDetailError(errorText(error, "Failed to delete template."));
    } finally {
      setDeleting(false);
    }
  };

  // Mocking the "current team template" logic by picking the first custom or built-in template
  const currentActiveTemplate =
    templates.find((t) => !t.is_builtin) || templates[0];
  const currentActivePresentation = currentActiveTemplate
    ? getTemplatePresentation(currentActiveTemplate.id)
    : null;
  const CurrentActiveIcon = getCategoryIcon(
    currentActivePresentation?.categories[0],
  );

  return (
    <div className="team-template-page flex h-full min-h-0 flex-col bg-transparent font-sans text-[var(--team-template-title)]">
      <TeamTemplatesHeader onCreate={startCreate} t={t} />

      <main className="flex-1 overflow-y-auto ot-scroll-area-styled">
        {loading && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--team-template-border)] border-t-[var(--team-template-title)]" />
          </div>
        )}

        {!loading && loadError && (
          <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
            <h2 className="text-[15px] font-medium text-[var(--team-template-title)]">
              Could not load templates
            </h2>
            <p className="mt-2 text-[14px] text-[var(--team-template-muted)]">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => void loadTemplates()}
              className={`${quietButtonClassName} mt-6 h-9 px-4 text-[13px] font-medium`}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && editorMode && (
          <TemplateEditor
            form={form}
            formError={formError}
            mode={editorMode}
            saving={saving}
            onCancel={() => setEditorMode(null)}
            onChange={setForm}
            onSave={() => void saveTemplate()}
          />
        )}

        {!loading && !loadError && !editorMode && selectedId && (
          <TemplateDetailView
            canEdit={canEditSelected}
            detail={selectedDetail}
            detailError={detailError}
            detailLoading={detailLoading}
            onBack={() => setSelectedId(null)}
            onDelete={() => void deleteSelected()}
            onEdit={startEdit}
            onRetryDetail={() => void loadDetail(selectedId)}
          />
        )}

        {!loading && !loadError && !editorMode && !selectedId && (
          <div className="mx-auto max-w-6xl p-6 md:p-8 lg:p-10">
            {currentActiveTemplate && (
              <section className="mb-10">
                <div className={`group relative flex cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-lg p-3 pr-4 ${activeSurfaceClassName} ${interactiveSurfaceClassName}`} onClick={() => setSelectedId(currentActiveTemplate.id)}>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-2 left-0 top-2 w-[2px] rounded-r-full bg-[var(--team-template-accent)] shadow-[0_0_10px_var(--team-template-accent-glow)]"
                  />
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-6 shrink-0 items-center justify-center text-[var(--team-template-icon-strong)] transition-colors duration-150 ease-out group-hover:text-[var(--team-template-title)]">
                      <CurrentActiveIcon className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-center">
                        <span className="font-mono text-[11px] font-medium text-[var(--team-template-aux)]">
                          当前激活模板
                        </span>
                      </div>
                      <h3 className="truncate text-sm font-semibold leading-snug text-[var(--team-template-title)]">
                        {currentActiveTemplate.name}
                      </h3>
                    </div>
                  </div>
                  <button className={`${quietButtonClassName} h-8 px-3 text-[12px] font-medium`}>
                    配置
                  </button>
                </div>
              </section>
            )}

            <section className="mb-12">
              <h2 className="mb-5 text-xs font-medium text-[var(--team-template-muted)]">
                我的团队模板 (<span className="font-mono text-[13px] tabular-nums text-[var(--team-template-title)]">{myTeamTemplates.length}</span>)
              </h2>
              {myTeamTemplates.length === 0 ? (
                <button
                  type="button"
                  onClick={startCreate}
                  className={`flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-[var(--team-template-border)] bg-[var(--team-template-surface)] py-12 shadow-[inset_0_1px_0_var(--team-template-top-highlight)] transition-all duration-150 ease-out hover:-translate-y-px hover:border-[var(--team-template-border-strong)] hover:bg-[var(--team-template-surface-hover)]`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-[var(--team-template-muted)] ${hairlineSurfaceClassName}`}>
                    <Plus className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-[var(--team-template-title)]">
                    创建自定义模板
                  </h3>
                  <p className="mt-1 text-xs text-[var(--team-template-muted)]">
                    Create a customized team configuration for your specific workflows.
                  </p>
                </button>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {myTeamTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onClick={() => setSelectedId(template.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-5 text-xs font-medium text-[var(--team-template-muted)]">
                更多推荐模板
              </h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {advancedTeamTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => {
                      setSelectedId(template.id);
                    }}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
