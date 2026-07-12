// Run with:
//   pnpm -C frontend exec tsx src/components/settings/customProviderForm.test.ts

import {
  buildCustomProvider,
  CUSTOM_PROVIDER_NUMERIC_DEFAULTS,
  hasRequiredCustomProviderCredentials,
  parseIntegerWithDefault,
  type CustomProviderFormState,
} from './customProviderForm';

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok  ${label}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${label}`, detail ?? '');
}

function form(overrides: Partial<CustomProviderFormState> = {}): CustomProviderFormState {
  return {
    apiKey: 'secret-key',
    baseURL: 'https://example.com/v1',
    id: 'example',
    models: [
      {
        contextLimit: '',
        id: 'model-a',
        inputImage: false,
        inputText: true,
        key: 'model-a-key',
        name: '',
        options: null,
        outputImage: false,
        outputLimit: '',
        outputText: true,
        thinkingBudget: '',
        thinkingEnabled: true,
      },
    ],
    name: '',
    npm: '@ai-sdk/openai-compatible',
    timeout: '',
    ...overrides,
  };
}

console.log('Custom provider form defaults');

const defaulted = buildCustomProvider(form());
const defaultedModel = defaulted.models?.['model-a'];
check(
  'blank operational values use the shared defaults',
  defaulted.options.timeout === CUSTOM_PROVIDER_NUMERIC_DEFAULTS.timeout &&
    defaultedModel?.limit?.context === CUSTOM_PROVIDER_NUMERIC_DEFAULTS.contextLimit &&
    defaultedModel.limit.output === CUSTOM_PROVIDER_NUMERIC_DEFAULTS.outputLimit &&
    (defaultedModel.options?.thinking as { budgetTokens?: number } | undefined)
      ?.budgetTokens === CUSTOM_PROVIDER_NUMERIC_DEFAULTS.thinkingBudget,
  defaulted,
);

const explicit = buildCustomProvider(
  form({
    timeout: '0',
    models: [
      {
        ...form().models[0],
        contextLimit: '0',
        outputLimit: '64000',
        thinkingBudget: '12000',
      },
    ],
  }),
);
const explicitModel = explicit.models?.['model-a'];
check(
  'explicit values take precedence and zero is preserved',
  explicit.options.timeout === 0 &&
    explicitModel?.limit?.context === 0 &&
    explicitModel.limit.output === 64000 &&
    (explicitModel.options?.thinking as { budgetTokens?: number } | undefined)
      ?.budgetTokens === 12000,
  explicit,
);

const thinkingDisabled = buildCustomProvider(
  form({
    models: [{ ...form().models[0], thinkingEnabled: false }],
  }),
);
check(
  'disabled thinking does not create a thinking option',
  thinkingDisabled.models?.['model-a'].options == null,
  thinkingDisabled.models?.['model-a'].options,
);

for (const invalid of ['-1', '1.5', 'not-a-number']) {
  let rejected = false;
  try {
    parseIntegerWithDefault(invalid, CUSTOM_PROVIDER_NUMERIC_DEFAULTS.timeout);
  } catch {
    rejected = true;
  }
  check(`invalid integer ${invalid} is rejected`, rejected);
}

check(
  'API key is required for provider credentials',
  !hasRequiredCustomProviderCredentials(form({ apiKey: '' })) &&
    hasRequiredCustomProviderCredentials(form({ apiKey: 'saved***key' })),
);

let missingApiKeyRejected = false;
try {
  buildCustomProvider(form({ apiKey: '' }));
} catch (error) {
  missingApiKeyRejected =
    error instanceof Error && error.message === 'api-key-required';
}
check('saving without an API key is rejected', missingApiKeyRejected);

for (const [label, invalidForm, expectedMessage] of [
  ['provider ID', form({ id: '' }), 'provider-id-required'],
  ['Base URL', form({ baseURL: '' }), 'base-url-required'],
  [
    'model ID',
    form({ models: [{ ...form().models[0], id: '' }] }),
    'model-id-required',
  ],
] as const) {
  let rejected = false;
  try {
    buildCustomProvider(invalidForm);
  } catch (error) {
    rejected = error instanceof Error && error.message === expectedMessage;
  }
  check(`saving without ${label} is rejected`, rejected);
}

if (failures > 0) process.exit(1);
