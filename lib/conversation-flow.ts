/**
 * Conversation flow management for deterministic anti-stuck progression
 *
 * Handles field advancement, reprompting, and validation integration
 */

import { Question, ToneConfig, ConversationMeta } from './types';
import {
  validateAnswer,
  generateRepromptMessage,
  isSkipRequest,
  isEndRequest,
  getAttemptLimit,
  ValidationResult,
} from './field-validation';

export interface ConversationState {
  currentFieldKey: string | null;
  currentFieldIndex: number;
  attempts: Record<string, number>;
  answers: Record<string, any>;
  meta: ConversationMeta;
}

export interface FlowDecision {
  action: 'advance' | 'reprompt' | 'skip' | 'end' | 'complete';
  message?: string;
  nextFieldKey?: string | null;
  shouldSaveAnswer?: boolean;
  normalizedValue?: any;
  abandonReason?: 'max_attempts' | 'user_quit';
}

/**
 * Map question types to validation field types
 */
function mapQuestionTypeToFieldType(questionType: string): string {
  const mapping: Record<string, string> = {
    short_text: 'text',
    long_text: 'textarea',
    single_choice: 'select',
    multiple_choice: 'select',
    yes_no: 'select',
    date: 'date',
    number: 'number',
    email: 'email',
    phone: 'phone',
  };
  return mapping[questionType] || 'text';
}

/**
 * Process user response and decide next action
 */
export function processUserResponse(
  userText: string,
  currentField: Question,
  state: ConversationState,
  questions: Question[],
  toneConfig?: ToneConfig
): FlowDecision {
  const fieldKey = currentField.key;
  const currentAttempts = state.attempts[fieldKey] || 0;
  const fieldType = mapQuestionTypeToFieldType(currentField.type);

  // Check for explicit skip request
  if (isSkipRequest(userText)) {
    if (!currentField.required) {
      // Allow skip for optional fields
      return {
        action: 'skip',
        nextFieldKey: getNextFieldKey(state.currentFieldIndex, questions),
        shouldSaveAnswer: false,
      };
    } else {
      // Required field cannot be skipped
      const tonePreset = toneConfig?.preset || 'casual';
      return {
        action: 'reprompt',
        message: generateRepromptMessage(
          currentField.label,
          fieldType,
          currentAttempts + 1,
          'refusal',
          true,
          tonePreset
        ),
      };
    }
  }

  // Check for end request
  if (isEndRequest(userText)) {
    return {
      action: 'end',
      abandonReason: 'user_quit',
    };
  }

  // Validate the answer
  const validation: ValidationResult = validateAnswer(
    fieldType,
    userText,
    {
      required: currentField.required,
      selectOptions: currentField.options?.map(opt => opt.value),
    }
  );

  // If valid, advance
  if (validation.ok) {
    const nextFieldKey = getNextFieldKey(state.currentFieldIndex, questions);
    return {
      action: nextFieldKey ? 'advance' : 'complete',
      nextFieldKey,
      shouldSaveAnswer: true,
      normalizedValue: validation.normalizedValue,
    };
  }

  // Invalid answer - check attempt count
  const newAttemptCount = currentAttempts + 1;
  const attemptLimit = getAttemptLimit(currentField.required);

  if (newAttemptCount >= attemptLimit) {
    // Max attempts reached
    if (!currentField.required) {
      // Optional field - offer to skip
      return {
        action: 'reprompt',
        message: generateRepromptMessage(
          currentField.label,
          fieldType,
          newAttemptCount,
          validation.reason,
          false,
          toneConfig?.preset || 'casual'
        ),
      };
    } else {
      // Required field - must end conversation
      return {
        action: 'end',
        message: `I'm unable to continue without your ${currentField.label.toLowerCase()}. Thank you for your time.`,
        abandonReason: 'max_attempts',
      };
    }
  }

  // Generate reprompt message
  const repromptMessage = generateRepromptMessage(
    currentField.label,
    fieldType,
    newAttemptCount,
    validation.reason,
    currentField.required,
    toneConfig?.preset || 'casual'
  );

  return {
    action: 'reprompt',
    message: repromptMessage,
  };
}

/**
 * Get next field key in sequence
 */
function getNextFieldKey(currentIndex: number, questions: Question[]): string | null {
  const nextIndex = currentIndex + 1;
  if (nextIndex < questions.length) {
    return questions[nextIndex].key;
  }
  return null;
}

/**
 * Initialize conversation state
 */
export function initializeConversationState(questions: Question[]): ConversationState {
  const firstFieldKey = questions.length > 0 ? questions[0].key : null;
  return {
    currentFieldKey: firstFieldKey,
    currentFieldIndex: 0,
    attempts: {},
    answers: {},
    meta: {
      currentFieldKey: firstFieldKey || undefined,
      currentFieldIndex: 0,
      attempts: {},
      lastActivity: new Date().toISOString(),
    },
  };
}

/**
 * Update conversation state after decision
 */
export function updateConversationState(
  state: ConversationState,
  decision: FlowDecision,
  currentFieldKey: string,
  normalizedValue?: any
): ConversationState {
  const newState = { ...state };
  const currentAttempts = state.attempts[currentFieldKey] || 0;

  switch (decision.action) {
    case 'advance':
      // Save answer and move to next field
      if (decision.shouldSaveAnswer && normalizedValue !== undefined) {
        newState.answers[currentFieldKey] = normalizedValue;
      }
      if (decision.nextFieldKey) {
        const nextIndex = state.currentFieldIndex + 1;
        newState.currentFieldKey = decision.nextFieldKey;
        newState.currentFieldIndex = nextIndex;
        newState.meta.currentFieldKey = decision.nextFieldKey;
        newState.meta.currentFieldIndex = nextIndex;
      }
      // Reset attempts for this field
      newState.attempts[currentFieldKey] = 0;
      break;

    case 'skip':
      // Move to next field without saving
      if (decision.nextFieldKey) {
        const nextIndex = state.currentFieldIndex + 1;
        newState.currentFieldKey = decision.nextFieldKey;
        newState.currentFieldIndex = nextIndex;
        newState.meta.currentFieldKey = decision.nextFieldKey;
        newState.meta.currentFieldIndex = nextIndex;
      }
      newState.attempts[currentFieldKey] = 0;
      break;

    case 'reprompt':
      // Increment attempt counter
      newState.attempts[currentFieldKey] = currentAttempts + 1;
      newState.meta.attempts = { ...newState.attempts };
      break;

    case 'end':
      // Mark as abandoned
      newState.meta.abandoned = true;
      newState.meta.abandonedReason = decision.abandonReason || 'user_quit';
      break;

    case 'complete':
      // Save final answer
      if (decision.shouldSaveAnswer && normalizedValue !== undefined) {
        newState.answers[currentFieldKey] = normalizedValue;
      }
      newState.currentFieldKey = null;
      newState.meta.currentFieldKey = undefined;
      break;
  }

  // Update last activity
  newState.meta.lastActivity = new Date().toISOString();

  return newState;
}

/**
 * Generate initial question prompt with tone
 */
export function generateInitialPrompt(
  question: Question,
  toneConfig?: ToneConfig
): string {
  // Use the question's message if available, otherwise use label
  return question.message || question.label;
}

/**
 * Check if conversation is complete
 */
export function isConversationComplete(state: ConversationState, questions: Question[]): boolean {
  return state.currentFieldKey === null || state.currentFieldIndex >= questions.length;
}

/**
 * Check if conversation is abandoned
 */
export function isConversationAbandoned(state: ConversationState): boolean {
  return state.meta.abandoned === true;
}
