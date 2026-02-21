/**
 * Tone of Voice Engine for Formactive
 *
 * Provides Formless-like tone presets with chattiness control.
 * Tone affects phrasing and verbosity, NOT what data is collected or field order.
 */

export type TonePreset = 'energetic' | 'sassy' | 'witty' | 'professional' | 'casual' | 'concise';

export interface ToneConfig {
  preset: TonePreset;
  custom: string;
  chattiness: number | null; // 0..1, null means use preset default
}

export interface ToneContract {
  preset: TonePreset;
  custom: string;
  effectiveChattiness: number; // computed final value 0..1
  verbosityTier: 'low' | 'medium' | 'high';
  styleRules: string[];
}

export interface TonePresetDefinition {
  label: string;
  description: string;
  defaultChattiness: number; // 0..1
}

/**
 * Tone presets with default chattiness levels
 * Matches Formless "bars" concept where more bars = more chatty
 */
export const TONE_PRESETS: Record<TonePreset, TonePresetDefinition> = {
  energetic: {
    label: 'Energetic',
    description: 'Upbeat and enthusiastic',
    defaultChattiness: 0.85,
  },
  sassy: {
    label: 'Sassy',
    description: 'Bold and confident',
    defaultChattiness: 0.70,
  },
  witty: {
    label: 'Witty',
    description: 'Clever and engaging',
    defaultChattiness: 0.60,
  },
  casual: {
    label: 'Casual',
    description: 'Relaxed and friendly',
    defaultChattiness: 0.55,
  },
  professional: {
    label: 'Professional',
    description: 'Business-appropriate and clear',
    defaultChattiness: 0.45,
  },
  concise: {
    label: 'Concise',
    description: 'Brief and to the point',
    defaultChattiness: 0.25,
  },
};

/**
 * Default tone configuration for new forms
 */
export const DEFAULT_TONE_CONFIG: ToneConfig = {
  preset: 'professional',
  custom: 'Friendly+Professional',
  chattiness: null,
};

/**
 * Compile a tone configuration into a contract with computed values
 */
export function compileToneContract(toneConfig: ToneConfig | null | undefined): ToneContract {
  const config = toneConfig || DEFAULT_TONE_CONFIG;
  const preset = config.preset || 'professional';
  const custom = config.custom || 'Friendly+Professional';

  // Get preset default chattiness
  const presetDefault = TONE_PRESETS[preset]?.defaultChattiness ?? 0.45;

  // Use override if provided, otherwise use preset default
  const effectiveChattiness = config.chattiness !== null && config.chattiness !== undefined
    ? clamp(config.chattiness, 0, 1)
    : presetDefault;

  // Determine verbosity tier from effective chattiness
  const verbosityTier = getVerbosityTier(effectiveChattiness);

  // Generate style rules based on preset and custom text
  const styleRules = generateStyleRules(preset, custom);

  return {
    preset,
    custom,
    effectiveChattiness,
    verbosityTier,
    styleRules,
  };
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Convert chattiness value to verbosity tier
 */
function getVerbosityTier(chattiness: number): 'low' | 'medium' | 'high' {
  if (chattiness <= 0.33) return 'low';
  if (chattiness <= 0.66) return 'medium';
  return 'high';
}

/**
 * Generate style rules based on preset and custom tone
 */
function generateStyleRules(preset: TonePreset, custom: string): string[] {
  const rules: string[] = [];

  // Base rules from preset
  switch (preset) {
    case 'energetic':
      rules.push('Use upbeat language');
      rules.push('Add enthusiasm without overusing exclamation marks');
      rules.push('Keep energy consistent throughout');
      break;
    case 'sassy':
      rules.push('Be confident and direct');
      rules.push('Use personality without being unprofessional');
      rules.push('Keep it bold but appropriate');
      break;
    case 'witty':
      rules.push('Add subtle cleverness');
      rules.push('Use light humor where appropriate');
      rules.push('Keep it smart, not silly');
      break;
    case 'casual':
      rules.push('Use conversational language');
      rules.push('Keep it relaxed and approachable');
      rules.push('Avoid overly formal phrasing');
      break;
    case 'professional':
      rules.push('Use clear, business-appropriate language');
      rules.push('Maintain professionalism throughout');
      rules.push('No emojis or casual slang');
      break;
    case 'concise':
      rules.push('Keep every question as brief as possible');
      rules.push('Eliminate unnecessary words');
      rules.push('Get straight to the point');
      break;
  }

  // Add custom tone guidance if provided
  if (custom && custom.trim()) {
    rules.push(`Overall tone: ${custom}`);
  }

  return rules;
}

/**
 * Get chattiness as a percentage (for display)
 */
export function getChattinessPercentage(contract: ToneContract): number {
  return Math.round(contract.effectiveChattiness * 100);
}

/**
 * Get visual indicator for chattiness level (number of bars, 1-4)
 */
export function getChattinessBars(chattiness: number): number {
  const clamped = clamp(chattiness, 0, 1);
  return Math.ceil(clamped * 4);
}

/**
 * Validate tone config
 */
export function validateToneConfig(config: any): ToneConfig {
  if (!config || typeof config !== 'object') {
    return DEFAULT_TONE_CONFIG;
  }

  return {
    preset: TONE_PRESETS[config.preset as TonePreset] ? config.preset : 'professional',
    custom: typeof config.custom === 'string' ? config.custom : 'Friendly+Professional',
    chattiness: typeof config.chattiness === 'number' ? clamp(config.chattiness, 0, 1) : null,
  };
}
