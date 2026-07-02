// Static checks for the onboarding and upgrade guide UI.
//
// Run with:
//     pnpm exec tsx src/components/onboarding/OnboardingGuide.test.tsx

import { readFileSync } from 'node:fs';

let failures = 0;
const check = (label: string, cond: boolean, detail?: unknown) => {
  if (cond) {
    // eslint-disable-next-line no-console
    console.log(`  ok  ${label}`);
  } else {
    failures += 1;
    // eslint-disable-next-line no-console
    console.error(`  FAIL ${label}`, detail ?? '');
  }
};

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

console.log('OnboardingGuide wiring');

const guideSource = read('./OnboardingGuide.tsx');
const appSource = read('../../App.tsx');
const settingsSource = read('../SettingsWorkspace.tsx');

const requiredLocaleKeys = [
  'onboarding.welcome.title',
  'onboarding.welcome.next',
  'onboarding.step.scenario.title',
  'onboarding.step.executor.title',
  'onboarding.step.projectPath.title',
  'onboarding.step.appearance.title',
  'onboarding.action.startNow',
  'onboarding.project.createTitle',
  'onboarding.project.createDesc',
  'onboarding.project.createFailed',
  'onboarding.project.detecting',
  'onboarding.project.gitDetected',
  'onboarding.project.gitMissing',
  'onboarding.project.gitignoreTemplate',
  'onboarding.project.initializeGit',
  'onboarding.project.nameRequired',
  'onboarding.project.namePlaceholder',
  'onboarding.project.nameTitle',
  'onboarding.project.pathPrompt',
  'onboarding.scenario.recommendedTemplate',
  'onboarding.upgrade.title',
  'onboarding.upgrade.markRead',
  'settings.onboarding.title',
  'settings.onboarding.resetGuide',
  'settings.onboarding.replayUpgrade',
];

check(
  'renders a full-screen guide component with onboarding and upgrade modes',
  guideSource.includes('export function OnboardingGuide') &&
    guideSource.includes("mode: 'onboarding' | 'upgrade'") &&
    guideSource.includes('fixed inset-0') &&
    guideSource.includes('renderUpgradeGuide'),
  guideSource,
);

check(
  'welcome page is independent from numbered steps',
  guideSource.includes("const welcomeStepKey = 'welcome'") &&
    guideSource.includes('activeStepKey === welcomeStepKey') &&
    guideSource.includes('if (isWelcome)') &&
    guideSource.includes('return renderConfigurationStep()') &&
    guideSource.includes('onboarding.welcome.next') &&
    guideSource.includes("useState('workflow_execution')") &&
    guideSource.includes('const welcomeCommandOptions = useMemo') &&
    guideSource.includes("label: '本地多Agent工作区'") &&
    guideSource.includes("label: '工作流编排引擎'") &&
    guideSource.includes("label: '智能体团队模板平台'") &&
    guideSource.includes("label: '项目进度加速器'") &&
    !guideSource.includes("label: '多Agent协作'") &&
    !guideSource.includes("keyHint: 'A'") &&
    guideSource.includes('window.addEventListener(\'keydown\', handleWelcomeShortcut)') &&
    guideSource.includes('onMouseEnter={() => setSelectedWelcomeCommandId(id)}') &&
    guideSource.includes('{selectedWelcomeCommand.label}') &&
    guideSource.includes('aria-pressed={active}') &&
    guideSource.includes('"JetBrains Mono", "SF Mono", "SFMono-Regular", ui-monospace') &&
    guideSource.includes("'--ink': '#f4f7fb'") &&
    guideSource.includes("'--ink-muted': '#c5ceda'") &&
    guideSource.includes('text-[#a8b3c2]') &&
    guideSource.includes('rounded-[6px] border border-white bg-white') &&
    guideSource.includes('px-9 py-3 text-[14px]') &&
    guideSource.includes('transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]') &&
    guideSource.includes('will-change-transform hover:-translate-y-[2px] hover:scale-[1.012]') &&
    guideSource.includes('hover:shadow-[inset_0_-1px_0_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.55),0_14px_34px_rgba(255,255,255,0.11)]') &&
    guideSource.includes('active:translate-y-[1px] active:scale-[0.988] active:bg-[#e7e7e7]') &&
    guideSource.includes('const onboardingNoiseTextureStyle') &&
    guideSource.includes('feTurbulence type=%27fractalNoise%27') &&
    guideSource.includes('opacity-[0.025]') &&
    guideSource.includes('shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]') &&
    guideSource.includes('flex min-h-[440px] w-full max-w-5xl flex-col overflow-hidden rounded-[8px] border border-white/[0.12] bg-[#0a0a0a]') &&
    guideSource.includes('h-2 w-2 rounded-full border border-white/[0.18] bg-transparent') &&
    guideSource.includes('flex min-h-0 flex-1 items-center justify-center px-4 py-10 sm:px-20') &&
    guideSource.includes('max-w-md -translate-y-4 overflow-hidden rounded-[6px] border border-white/[0.12] bg-[#0a0a0a]') &&
    guideSource.includes('min-w-6 rounded-[3px] border border-white/[0.18] bg-[#0c0c0c]') &&
    guideSource.includes("active ? 'text-white' : 'text-[#8792a3]'") &&
    guideSource.includes('absolute bottom-2 left-0 top-2 w-px') &&
    guideSource.includes('text-current opacity-55') &&
    guideSource.includes('mt-12 flex flex-col items-center gap-4') &&
    guideSource.includes('tracking-[0.22em] text-[#8f9aaa]') &&
    guideSource.includes('ALL 4 STEPS TO FINISH CONFIGURATION') &&
    !guideSource.includes('top-1/2 -z-10 h-3/4 w-3/4') &&
    !guideSource.includes('Press Enter') &&
    !guideSource.includes('h-0.5 w-10 rounded-full bg-[#f4f4f5]') &&
    !guideSource.includes('welcomeStepKey, ...onboardingSteps'),
  guideSource,
);

check(
  'four onboarding steps are ordered as scenario, executor, project path, appearance',
  guideSource.includes(
    "const onboardingSteps = ['scenario', 'executor', 'project_path', 'appearance'] as const",
  ),
  guideSource,
);

check(
  'scenario page only exposes recommended team names, not member rows',
    guideSource.includes('renderScenarioStep') &&
    guideSource.includes('recommendedTeamName') &&
    guideSource.includes('recommendOnboardingTeamTemplate') &&
    guideSource.includes("t('onboarding.scenario.memberDetailsHint')") &&
    guideSource.includes('renderExecutorStep') &&
    guideSource.includes('teamMembers.map') &&
    !/renderScenarioStep[\s\S]*teamMembers\.map/.test(guideSource),
  guideSource,
);

check(
  'executor and model configuration reuses DropdownSelect',
  guideSource.includes('import { DropdownSelect') &&
    guideSource.includes('runnerOptions') &&
    guideSource.includes('modelOptionsForRunner') &&
    (guideSource.match(/<DropdownSelect/g) ?? []).length >= 2,
  guideSource,
);

check(
  'project path step uses existing filesystem and workspace validation APIs',
  guideSource.includes('filesystemApi.listRoots') &&
    guideSource.includes('filesystemApi.listDirectory') &&
    guideSource.includes('chatSessionsApi.validateWorkspacePath') &&
    guideSource.includes('chatSessionsApi.initializeWorkspaceGit') &&
    !guideSource.includes('webkitdirectory'),
  guideSource,
);

check(
  'project path step uses the flat grid layout with micro Git controls',
  guideSource.includes('lg:grid-cols-[minmax(0,65%)_minmax(280px,35%)]') &&
    guideSource.includes("gitignoreTemplates = ['node', 'go', 'python', 'none'] as const") &&
    guideSource.includes("grid-rows-[1fr]") &&
    guideSource.includes('chatSessionsApi.initializeWorkspaceGit') &&
    guideSource.includes('className="flex h-7 w-7 items-center justify-center text-[#768295] transition hover:text-[#f4f7fb]"') &&
    guideSource.includes('rounded-[4px] border border-[#333] bg-black') &&
    !guideSource.includes("0_4px_20px_rgba(95,99,242,0.25)") &&
    guideSource.includes("onboarding.project.gitMissing"),
  guideSource,
);

check(
  'configuration steps reuse the welcome page background treatment',
    guideSource.includes('absolute inset-0 bg-[#050505]') &&
    guideSource.includes('opacity-[0.032] mix-blend-screen') &&
    guideSource.includes('items-center justify-center overflow-y-auto py-8') &&
    guideSource.includes('relative mt-7 w-full max-w-5xl p-0 text-left') &&
    guideSource.includes('mt-12 grid w-full max-w-5xl') &&
    guideSource.includes("active ? 'bg-white' : 'bg-[#262626]'") &&
    !guideSource.includes('max-w-[760px]') &&
    !guideSource.includes('radial-gradient') &&
    !guideSource.includes("backgroundSize: stepKey === 'project_path'"),
  guideSource,
);

check(
  'scenario executor and appearance steps share the create project flat styling',
    guideSource.includes('renderScenarioStep') &&
    guideSource.includes('renderExecutorStep') &&
    guideSource.includes('renderAppearanceStep') &&
    guideSource.includes('flex min-h-[360px] flex-col justify-center border-y border-[#262626] py-5') &&
    guideSource.includes('max-w-5xl gap-3 md:grid-cols-2') &&
    guideSource.includes('border-white/[0.07] hover:border-white/[0.14]') &&
    guideSource.includes('border-white/35 bg-white/[0.05]') &&
    guideSource.includes('items-center justify-between') &&
    guideSource.includes('rounded-[4px] border border-[#262626] bg-[#0a0a0a]') &&
    guideSource.includes('strokeWidth={1}') &&
    guideSource.includes("t('onboarding.scenario.memberDetailsHint')") &&
    guideSource.includes('text-[12px] leading-relaxed') &&
    !guideSource.includes('[ ↳ Details in next step ]') &&
    guideSource.includes('tracking-[0.12em] text-[#7d8aa3]') &&
    guideSource.includes('rounded-[8px]') &&
    !guideSource.includes('selected && <Check') &&
    !guideSource.includes('text-[44px]') &&
    !guideSource.includes('rounded-full border border-white/10 bg-white/[0.06]'),
  guideSource,
);

check(
  'scenario next button owns the hover motion treatment',
  guideSource.includes("stepKey === 'scenario' &&") &&
    guideSource.includes('transition-[background-color,box-shadow,transform] duration-200') &&
    guideSource.includes('hover:-translate-y-[2px] hover:scale-[1.02]') &&
    guideSource.includes('active:translate-y-[1px] active:scale-[0.98]') &&
    guideSource.includes('hover:shadow-[0_12px_30px_rgba(255,255,255,0.18)]') &&
    !guideSource.includes('hover:scale-[1.006]') &&
    !guideSource.includes('hover:shadow-[0_12px_30px_rgba(0,0,0,0.32)]') &&
    !guideSource.includes('hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)'),
  guideSource,
);

check(
  'scenario page applies final contrast spacing footer and slide transition polish',
  guideSource.includes('border-white/[0.07] hover:border-white/[0.14]') &&
    guideSource.includes('py-4 pl-4 pr-6') &&
    guideSource.includes('md:pr-8') &&
    guideSource.includes('bg-[rgba(0,0,0,0.05)]') &&
    guideSource.includes('text-black/40 shadow-none') &&
    guideSource.includes('text-[rgba(255,255,255,0.35)]') &&
    guideSource.includes('flex min-h-10 items-center justify-center') &&
    guideSource.includes('renderedConfigurationStepKey') &&
    guideSource.includes("configurationMotionState === 'slide-out'") &&
    guideSource.includes('-translate-x-8 opacity-0') &&
    guideSource.includes('transition-[opacity,transform] duration-[180ms]'),
  guideSource,
);

check(
  'zh scenario copy matches the requested first-step wording',
  read('../../locales/zh/common.json').includes(
    '"onboarding.scenario.title": "你正在构建什么？"',
  ) &&
    read('../../locales/zh/common.json').includes(
      '"onboarding.scenario.other.title": "其他"',
    ),
  guideSource,
);

check(
  'project names are sanitized before onboarding project creation',
  guideSource.includes("import { sanitizeProjectName }") &&
    guideSource.includes('const name = sanitizeProjectName(projectName)') &&
    guideSource.includes('setProjectName(sanitizeProjectName(event.target.value))'),
  guideSource,
);

check(
  'start now creates a real project, completes onboarding, then opens the existing session composer',
  guideSource.indexOf('await onCreateProjectFromOnboarding') <
    guideSource.indexOf('await onboardingApi.complete') &&
  guideSource.includes('await onboardingApi.complete') &&
    guideSource.includes('path: projectDraft.path') &&
    guideSource.includes('created_project_id: createdProject.projectId') &&
    guideSource.includes('onOpenCreateSession(state)') &&
    appSource.includes('onCreateProjectFromOnboarding={handleCreateOnboardingProject}') &&
    appSource.includes('return { projectId: project.id, sessionId: null }') &&
    appSource.includes('handleOnboardingCompleted') &&
    appSource.includes('setIsCreateSessionModalOpen(true)'),
  { guideSource, appSource },
);

check(
  'App loads onboarding state on startup and gates upgrade by current version',
  appSource.includes('onboardingApi.getState()') &&
    appSource.includes('compareVersions(') &&
    appSource.includes('last_seen_upgrade_version') &&
    appSource.includes('currentUpgradeVersion') &&
    appSource.includes('<OnboardingGuide'),
  appSource,
);

check(
  'onboarding state changes keep the active overlay state synchronized',
  appSource.includes('setOnboardingOverlay((current) =>') &&
    appSource.includes('current ? { ...current, state: nextState } : current'),
  appSource,
);

check(
  'initialization effect does not reset the active step when runtimes templates locale or theme change',
  guideSource.includes('const initializeFromState =') &&
    guideSource.includes('useEffect(() => {') &&
    guideSource.includes('initializeFromState(initialState);') &&
    guideSource.includes('}, [initialState]);') &&
    !guideSource.includes('buildTeamConfigForScenario,\n    initialState,\n    locale,') &&
    !guideSource.includes('projectNameForScenario,\n    theme,'),
  guideSource,
);

check(
  'SettingsWorkspace provides reset and replay actions through onboarding API',
  settingsSource.includes('onboardingApi.reset()') &&
    settingsSource.includes('onboardingApi.resetUpgradeRead()') &&
    settingsSource.includes('ONBOARDING_GUIDE_RESET_EVENT') &&
    settingsSource.includes('ONBOARDING_UPGRADE_REPLAY_EVENT'),
  settingsSource,
);

check(
  'upgrade guide marks the current version as read',
  guideSource.includes('onboardingApi.markUpgradeRead({ version: currentVersion })') &&
    guideSource.includes('onUpgradeRead(state)'),
  guideSource,
);

check(
  'language and appearance selections preview immediately and save draft state',
  guideSource.includes('onPreviewLocaleChange(option.id)') &&
    guideSource.includes('onPreviewAppearanceChange(option.id)') &&
    guideSource.includes("saveDraft({ language: localeToOnboardingLanguage[option.id] })") &&
    guideSource.includes("saveDraft({ appearance: option.id })") &&
    appSource.includes('onPreviewLocaleChange={setLocale}') &&
    appSource.includes('onPreviewAppearanceChange={handleOnboardingPreviewAppearanceChange}'),
  { guideSource, appSource },
);

for (const locale of ['en', 'zh', 'ja', 'ko', 'fr', 'es']) {
  const commonSource = read(`../../locales/${locale}/common.json`);
  const settingsLocaleSource = read(`../../locales/${locale}/settings.json`);
  check(
    `locale ${locale} contains onboarding and settings guide keys`,
    requiredLocaleKeys.every((key) =>
      key.startsWith('settings.')
        ? settingsLocaleSource.includes(`"${key}"`)
        : commonSource.includes(`"${key}"`),
    ),
    { commonSource, settingsLocaleSource },
  );
}

if (failures > 0) {
  process.exitCode = 1;
}
