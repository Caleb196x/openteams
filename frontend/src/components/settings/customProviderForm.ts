import type { CustomModelConfig, CustomProviderEntry } from '../../lib/cliConfigTypes';
import {
  DEFAULT_CUSTOM_PROVIDER_NPM,
  isMaskedSecret,
  normalizeCustomProviderEntry,
  trimToNull,
} from '../../lib/cliConfigTypes';

export const CUSTOM_PROVIDER_NUMERIC_DEFAULTS = {
  contextLimit: 262144,
  outputLimit: 32768,
  thinkingBudget: 9216,
  timeout: 60000,
} as const;

export type ModelDraft = {
  contextLimit: string;
  id: string;
  inputText: boolean;
  inputImage: boolean;
  key: string;
  name: string;
  options: Record<string, unknown> | null;
  outputLimit: string;
  outputText: boolean;
  outputImage: boolean;
  thinkingBudget: string;
  thinkingEnabled: boolean;
};

export type CustomProviderFormState = {
  apiKey: string;
  baseURL: string;
  id: string;
  models: ModelDraft[];
  name: string;
  npm: string;
  timeout: string;
};

export function parseIntegerWithDefault(value: string, fallback: number): number {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('invalid-number');
  }
  return parsed;
}

export function hasRequiredCustomProviderCredentials(
  formState: CustomProviderFormState,
): boolean {
  return Boolean(
    trimToNull(formState.id) &&
      trimToNull(formState.baseURL) &&
      trimToNull(formState.apiKey),
  );
}

function selectedModalities(text: boolean, image: boolean): string[] | null {
  const values = [text ? 'text' : null, image ? 'image' : null].filter(
    Boolean,
  ) as string[];
  return values.length > 0 ? values : null;
}

function modelOptions(model: ModelDraft): Record<string, unknown> | null {
  const base = Object.fromEntries(
    Object.entries(model.options ?? {}).filter(([key]) => key !== 'thinking'),
  );
  if (!model.thinkingEnabled) {
    return Object.keys(base).length > 0 ? base : null;
  }
  return {
    ...base,
    thinking: {
      type: 'enabled',
      budgetTokens: parseIntegerWithDefault(
        model.thinkingBudget,
        CUSTOM_PROVIDER_NUMERIC_DEFAULTS.thinkingBudget,
      ),
    },
  };
}

export function buildCustomProvider(
  formState: CustomProviderFormState,
): CustomProviderEntry {
  if (!trimToNull(formState.id)) throw new Error('provider-id-required');
  if (!trimToNull(formState.baseURL)) throw new Error('base-url-required');
  if (!trimToNull(formState.apiKey)) throw new Error('api-key-required');

  const models = formState.models.reduce<Record<string, CustomModelConfig>>(
    (acc, model) => {
      const id = model.id.trim();
      if (!id) throw new Error('model-id-required');
      acc[id] = {
        name: trimToNull(model.name),
        modalities: {
          input: selectedModalities(model.inputText, model.inputImage),
          output: selectedModalities(model.outputText, model.outputImage),
        },
        options: modelOptions(model),
        limit: {
          context: parseIntegerWithDefault(
            model.contextLimit,
            CUSTOM_PROVIDER_NUMERIC_DEFAULTS.contextLimit,
          ),
          output: parseIntegerWithDefault(
            model.outputLimit,
            CUSTOM_PROVIDER_NUMERIC_DEFAULTS.outputLimit,
          ),
        },
      };
      return acc;
    },
    {},
  );

  return normalizeCustomProviderEntry({
    id: formState.id,
    name: formState.name,
    npm: formState.npm || DEFAULT_CUSTOM_PROVIDER_NPM,
    options: {
      api_key: isMaskedSecret(formState.apiKey)
        ? formState.apiKey
        : trimToNull(formState.apiKey),
      baseURL: trimToNull(formState.baseURL),
      timeout: parseIntegerWithDefault(
        formState.timeout,
        CUSTOM_PROVIDER_NUMERIC_DEFAULTS.timeout,
      ),
    },
    models,
  });
}
