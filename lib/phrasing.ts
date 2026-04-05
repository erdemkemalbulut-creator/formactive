/**
 * Phrasing Template System
 *
 * Provides verbosity-based phrasing variants for different question types.
 * Implements SAFE, deterministic tone application that ONLY affects wording,
 * never the data collected, field order, or completion logic.
 */

import { QuestionType } from './types';
import { ToneContract } from './tone';

export interface PhrasingVariants {
  low: string;
  medium: string;
  high: string;
}

/**
 * Default phrasing templates by question type and verbosity level
 */
const PHRASING_TEMPLATES: Record<QuestionType, PhrasingVariants> = {
  short_text: {
    low: '{label}',
    medium: 'What is your {label}?',
    high: 'Could you share your {label} with me?',
  },
  long_text: {
    low: '{label}',
    medium: 'Tell me about {label}.',
    high: 'I\'d love to hear more about {label}. Take your time.',
  },
  email: {
    low: '{label}',
    medium: 'What\'s your email address?',
    high: 'Could you share your email so we can stay in touch?',
  },
  phone: {
    low: '{label}',
    medium: 'What\'s your phone number?',
    high: 'Could you share a phone number where we can reach you?',
  },
  number: {
    low: '{label}',
    medium: 'What number for {label}?',
    high: 'Could you give me a number for {label}?',
  },
  date: {
    low: '{label}',
    medium: 'What date for {label}?',
    high: 'When would you like to set {label}?',
  },
  single_choice: {
    low: '{label}',
    medium: 'Which one would you pick for {label}?',
    high: 'I have a few options for {label} — which one fits best?',
  },
  multiple_choice: {
    low: '{label}',
    medium: 'Select all that apply for {label}.',
    high: 'Pick as many as you like for {label}.',
  },
  yes_no: {
    low: '{label}',
    medium: '{label} — yes or no?',
    high: 'Quick one: {label}?',
  },
  cta: {
    low: '{label}',
    medium: '{label}',
    high: '{label}',
  },
  statement: {
    low: '{label}',
    medium: '{label}',
    high: '{label}',
  },
  file_upload: {
    low: '{label}',
    medium: 'Upload your {label}.',
    high: 'Could you upload your {label}? I\'ll wait.',
  },
};

/**
 * Validation error messages by question type and verbosity level
 */
const VALIDATION_TEMPLATES: Record<string, PhrasingVariants> = {
  required: {
    low: 'Required',
    medium: 'This field is required',
    high: 'We need this information to continue',
  },
  email_invalid: {
    low: 'Invalid email',
    medium: 'Please enter a valid email',
    high: 'Please enter a valid email address',
  },
  phone_invalid: {
    low: 'Invalid phone',
    medium: 'Please enter a valid phone number',
    high: 'Please enter a valid phone number',
  },
  select_required: {
    low: 'Select at least one',
    medium: 'Please select at least one option',
    high: 'Please choose at least one option to continue',
  },
};

/**
 * Wrapper phrases by preset and verbosity
 */
const WRAPPER_PHRASES = {
  energetic: {
    prefix: {
      low: '',
      medium: 'Awesome! ',
      high: 'Love it! ',
    },
    suffix: {
      low: '',
      medium: '',
      high: ' Let\'s go!',
    },
  },
  sassy: {
    prefix: {
      low: '',
      medium: 'Alright, ',
      high: 'Okay then — ',
    },
    suffix: {
      low: '',
      medium: '',
      high: ' Don\'t be shy.',
    },
  },
  witty: {
    prefix: {
      low: '',
      medium: 'So, ',
      high: 'Here\'s a fun one — ',
    },
    suffix: {
      low: '',
      medium: '',
      high: ' No pressure.',
    },
  },
  casual: {
    prefix: {
      low: '',
      medium: '',
      high: 'Hey, ',
    },
    suffix: {
      low: '',
      medium: '',
      high: '',
    },
  },
  professional: {
    prefix: {
      low: '',
      medium: '',
      high: 'Please provide ',
    },
    suffix: {
      low: '',
      medium: '.',
      high: '.',
    },
  },
  concise: {
    prefix: {
      low: '',
      medium: '',
      high: '',
    },
    suffix: {
      low: '',
      medium: '',
      high: '',
    },
  },
};

/**
 * Apply tone-based phrasing to a question message
 *
 * IMPORTANT: This function is SAFE and deterministic.
 * It ONLY affects the phrasing of existing messages, never adds/removes/reorders questions.
 */
export function applyTonePhrasing(
  message: string | undefined | null,
  label: string,
  questionType: QuestionType,
  toneContract: ToneContract
): string {
  // If there's already a custom message, use it as-is (user has full control)
  if (message && message.trim()) {
    return message.trim();
  }

  // Get template for this question type and verbosity tier
  const template = PHRASING_TEMPLATES[questionType]?.[toneContract.verbosityTier] || '{label}';
  const baseText = template.replace('{label}', label || 'your answer');

  // Get wrapper phrases for this preset and verbosity
  const preset = toneContract.preset;
  const tier = toneContract.verbosityTier;
  const wrapper = WRAPPER_PHRASES[preset];

  const prefix = wrapper?.prefix?.[tier] || '';
  const suffix = wrapper?.suffix?.[tier] || '';

  return `${prefix}${baseText}${suffix}`.trim();
}

/**
 * Get validation error message with tone applied
 */
export function getValidationMessage(
  errorType: 'required' | 'email_invalid' | 'phone_invalid' | 'select_required',
  toneContract: ToneContract
): string {
  const template = VALIDATION_TEMPLATES[errorType];
  if (!template) return 'Invalid input';

  return template[toneContract.verbosityTier];
}

/**
 * Apply tone to welcome message
 */
export function applyToneToWelcome(
  welcomeMessage: string | undefined | null,
  toneContract: ToneContract
): string {
  if (!welcomeMessage || !welcomeMessage.trim()) {
    return '';
  }

  // For welcome messages, we preserve the user's text
  // Tone primarily affects conversation flow, not static content
  return welcomeMessage.trim();
}

/**
 * Apply tone to end message
 */
export function applyToneToEnd(
  endMessage: string | undefined | null,
  toneContract: ToneContract
): string {
  if (!endMessage || !endMessage.trim()) {
    // Default end message with tone
    const tier = toneContract.verbosityTier;
    switch (tier) {
      case 'low':
        return 'Done!';
      case 'medium':
        return 'Thank you!';
      case 'high':
        return 'Thank you for your response!';
    }
  }

  // For custom end messages, preserve user's text
  return endMessage.trim();
}

/**
 * Get button text with tone applied
 */
export function getButtonText(
  defaultText: string,
  toneContract: ToneContract
): string {
  // Button text is kept consistent for UX clarity
  // Tone doesn't significantly affect CTAs
  return defaultText;
}

/**
 * Get placeholder text with tone applied
 */
export function getPlaceholderText(
  questionType: QuestionType,
  toneContract: ToneContract
): string {
  const tier = toneContract.verbosityTier;

  switch (questionType) {
    case 'email':
      return tier === 'low' ? 'email@example.com' : 'Your email';
    case 'phone':
      return tier === 'low' ? '+1 234 567 8900' : 'Your phone number';
    case 'number':
      return tier === 'low' ? '0' : 'Enter a number';
    case 'date':
      return tier === 'low' ? 'Select date' : 'Choose a date';
    case 'short_text':
    case 'long_text':
    default:
      return tier === 'low' ? 'Type here' : 'Type your answer here';
  }
}
