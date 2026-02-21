/**
 * Field validation utilities for anti-stuck conversational progression
 *
 * Implements deterministic validation rules per field type to prevent
 * infinite loops and handle hostile/junk answers gracefully.
 */

export type ValidationResult = {
  ok: boolean;
  normalizedValue?: any;
  reason?: 'invalid_format' | 'refusal' | 'nonsense' | 'empty' | 'too_short';
};

/**
 * Blocklist of common junk/refusal responses
 * Case-insensitive matching
 */
const REFUSAL_BLOCKLIST = [
  'n/a',
  'na',
  'none',
  'no',
  'nope',
  'not your business',
  'not your concern',
  'idk',
  'i dont know',
  "i don't know",
  'dont know',
  "don't know",
  'whatever',
  'nothing',
  'dunno',
  'pass',
  'skip',
  'refuse',
  'declined',
  'private',
  'confidential',
  'not telling',
  'not saying',
  'mind your business',
  'myob',
];

/**
 * Check if text matches refusal patterns
 */
function isRefusal(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return REFUSAL_BLOCKLIST.some(blocked => normalized === blocked || normalized.includes(blocked));
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (at least 7 digits)
 */
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7;
}

/**
 * Validate date format
 */
function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if text is too short to be meaningful
 */
function isTooShort(text: string, minLength: number = 2): boolean {
  return text.trim().length < minLength;
}

/**
 * Check if text is likely nonsense (single char repeated, keyboard spam, etc.)
 */
function isNonsense(text: string): boolean {
  const trimmed = text.trim();

  // Single character repeated
  if (trimmed.length > 1 && new Set(trimmed.toLowerCase()).size === 1) {
    return true;
  }

  // Very short with no vowels (likely keyboard spam)
  if (trimmed.length <= 4 && !/[aeiou]/i.test(trimmed)) {
    return true;
  }

  // Excessive punctuation
  const punctuationRatio = (trimmed.match(/[!?.,:;]/g) || []).length / trimmed.length;
  if (punctuationRatio > 0.5) {
    return true;
  }

  return false;
}

/**
 * Main validation function for different field types
 */
export function validateAnswer(
  fieldType: string,
  userText: string,
  options?: { required?: boolean; selectOptions?: string[] }
): ValidationResult {
  const trimmed = userText.trim();

  // Check for empty
  if (!trimmed) {
    return { ok: false, reason: 'empty' };
  }

  // Check for refusal patterns
  if (isRefusal(trimmed)) {
    return { ok: false, reason: 'refusal' };
  }

  // Type-specific validation
  switch (fieldType) {
    case 'email':
      if (!isValidEmail(trimmed)) {
        return { ok: false, reason: 'invalid_format' };
      }
      return { ok: true, normalizedValue: trimmed.toLowerCase() };

    case 'phone':
      if (!isValidPhone(trimmed)) {
        return { ok: false, reason: 'invalid_format' };
      }
      return { ok: true, normalizedValue: trimmed };

    case 'date':
      if (!isValidDate(trimmed)) {
        return { ok: false, reason: 'invalid_format' };
      }
      return { ok: true, normalizedValue: new Date(trimmed).toISOString() };

    case 'url':
      if (!isValidUrl(trimmed)) {
        return { ok: false, reason: 'invalid_format' };
      }
      return { ok: true, normalizedValue: trimmed };

    case 'number':
      const num = parseFloat(trimmed);
      if (isNaN(num)) {
        return { ok: false, reason: 'invalid_format' };
      }
      return { ok: true, normalizedValue: num };

    case 'select':
    case 'radio':
      if (!options?.selectOptions) {
        return { ok: false, reason: 'invalid_format' };
      }
      // Fuzzy match against options (case-insensitive)
      const match = options.selectOptions.find(
        opt => opt.toLowerCase() === trimmed.toLowerCase()
      );
      if (!match) {
        return { ok: false, reason: 'invalid_format' };
      }
      return { ok: true, normalizedValue: match };

    case 'text':
    case 'name':
    case 'textarea':
    default:
      // Check length
      if (isTooShort(trimmed)) {
        return { ok: false, reason: 'too_short' };
      }

      // Check for nonsense
      if (isNonsense(trimmed)) {
        return { ok: false, reason: 'nonsense' };
      }

      return { ok: true, normalizedValue: trimmed };
  }
}

/**
 * Generate appropriate reprompt message based on attempt count and validation reason
 */
export function generateRepromptMessage(
  fieldLabel: string,
  fieldType: string,
  attemptCount: number,
  validationReason?: string,
  isRequired: boolean = true,
  tone: string = 'casual'
): string {
  const isFriendly = ['casual', 'witty', 'sassy', 'energetic'].includes(tone);
  const isFormal = tone === 'professional';

  // Attempt 1: Gentle reprompt
  if (attemptCount === 1) {
    if (validationReason === 'refusal') {
      if (isFriendly) {
        return `I understand, but I do need your ${fieldLabel.toLowerCase()} to continue. Could you share it?`;
      } else if (isFormal) {
        return `I require your ${fieldLabel.toLowerCase()} to proceed. Please provide this information.`;
      } else {
        return `I need your ${fieldLabel.toLowerCase()} to move forward. Can you share it?`;
      }
    } else if (validationReason === 'invalid_format') {
      if (fieldType === 'email') {
        return `That doesn't look like a valid email address. Could you double-check and try again?`;
      } else if (fieldType === 'phone') {
        return `That doesn't seem to be a complete phone number. Can you provide your full number?`;
      } else if (fieldType === 'date') {
        return `I couldn't parse that as a date. Could you try a format like MM/DD/YYYY?`;
      } else {
        return `That doesn't look quite right. Could you try again?`;
      }
    } else {
      return `Could you provide a bit more detail for your ${fieldLabel.toLowerCase()}?`;
    }
  }

  // Attempt 2: More direct + example
  if (attemptCount === 2) {
    if (validationReason === 'refusal') {
      if (isFriendly) {
        return `I get it, but this is actually required. Without your ${fieldLabel.toLowerCase()}, I can't help you complete this form.`;
      } else {
        return `This information is necessary. Please provide your ${fieldLabel.toLowerCase()} to continue.`;
      }
    } else if (validationReason === 'invalid_format') {
      if (fieldType === 'email') {
        return `Please enter a valid email address, for example: name@example.com`;
      } else if (fieldType === 'phone') {
        return `Please enter a valid phone number with at least 7 digits, like: (555) 123-4567`;
      } else if (fieldType === 'date') {
        return `Please enter a valid date, for example: 12/31/2024 or December 31, 2024`;
      } else if (fieldType === 'select') {
        return `Please choose one of the provided options.`;
      } else {
        return `Please provide a valid ${fieldLabel.toLowerCase()} so we can continue.`;
      }
    } else {
      return `I need a complete answer for ${fieldLabel.toLowerCase()}. Could you elaborate a bit?`;
    }
  }

  // Attempt 3+: Final attempt with options
  if (!isRequired) {
    if (isFriendly) {
      return `This is optional - would you like to skip this question and move on? Just say "skip" or try answering one more time.`;
    } else {
      return `This field is optional. You may skip it by typing "skip", or provide an answer to continue.`;
    }
  } else {
    if (isFriendly) {
      return `I really can't continue without your ${fieldLabel.toLowerCase()}. This is the last try - please provide a valid answer, or we'll need to end here.`;
    } else {
      return `I cannot proceed without this required information. Please provide your ${fieldLabel.toLowerCase()} to continue, or we will need to conclude this conversation.`;
    }
  }
}

/**
 * Check if user explicitly wants to skip
 */
export function isSkipRequest(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return normalized === 'skip' ||
         normalized === 'skip it' ||
         normalized === 'skip this' ||
         normalized === 'pass' ||
         normalized === 'next';
}

/**
 * Check if user wants to end conversation
 */
export function isEndRequest(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return normalized === 'end' ||
         normalized === 'quit' ||
         normalized === 'exit' ||
         normalized === 'stop' ||
         normalized === 'cancel' ||
         normalized === 'nevermind' ||
         normalized === 'never mind' ||
         normalized === "i'm done" ||
         normalized === 'im done';
}

/**
 * Get attempt limit based on field requirement
 */
export function getAttemptLimit(isRequired: boolean): number {
  return isRequired ? 3 : 3; // Same limit, but different handling
}
