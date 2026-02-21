/**
 * Journey-to-schema mapping utilities
 *
 * Maps plain-text Journey instructions to structured form fields
 * while maintaining schema-driven validation and advancement
 */

import { Question } from './types';

/**
 * Get the Journey instruction for display
 * Falls back to message or label if no journey instruction exists
 */
export function getJourneyText(question: Question): string {
  return question.journeyInstruction || question.message || question.label;
}

/**
 * Get the field requirement from schema (deterministic)
 * Journey text is for phrasing only, not for determining requirements
 */
export function isFieldRequired(question: Question): boolean {
  return question.required;
}

/**
 * Get field type from schema (deterministic)
 * Journey text doesn't affect field type
 */
export function getFieldType(question: Question): string {
  return question.type;
}

/**
 * Get field validation options from schema (deterministic)
 * Journey text doesn't affect validation rules
 */
export function getFieldOptions(question: Question): string[] | null {
  if (!question.options || question.options.length === 0) {
    return null;
  }
  return question.options.map(opt => opt.value);
}

/**
 * Build a natural prompt that respects Journey instruction
 * while being aware of strict mode
 */
export function buildPromptForField(
  question: Question,
  strictMode: boolean,
  tone: string = 'casual'
): string {
  const journeyText = getJourneyText(question);

  // In strict mode, we use the Journey text as-is
  // The validation system will enforce schema requirements regardless
  return journeyText;
}

/**
 * Check if Journey instruction should override default messaging
 * Always returns true if journeyInstruction exists
 */
export function hasCustomJourneyInstruction(question: Question): boolean {
  return Boolean(question.journeyInstruction && question.journeyInstruction.trim().length > 0);
}

/**
 * Merge Journey instruction into question for display
 * This is used when rendering the conversational form
 */
export function prepareQuestionForDisplay(
  question: Question,
  strictMode: boolean
): Question {
  // In strict mode with Journey instruction, use it for message
  if (strictMode && hasCustomJourneyInstruction(question)) {
    return {
      ...question,
      message: question.journeyInstruction!,
    };
  }

  // Otherwise use default message
  return question;
}

/**
 * Extract schema requirements for validation
 * This is what determines advancement, not Journey text
 */
export interface SchemaRequirements {
  fieldKey: string;
  fieldType: string;
  required: boolean;
  options: string[] | null;
  label: string;
}

export function extractSchemaRequirements(question: Question): SchemaRequirements {
  return {
    fieldKey: question.key,
    fieldType: question.type,
    required: question.required,
    options: getFieldOptions(question),
    label: question.label,
  };
}

/**
 * Validate that Journey instructions don't conflict with schema
 * Returns warnings if Journey text implies different requirements than schema
 */
export function validateJourneySchemaAlignment(question: Question): string[] {
  const warnings: string[] = [];
  const journey = question.journeyInstruction?.toLowerCase() || '';

  // Check if Journey implies optional but schema says required
  if (question.required) {
    if (journey.includes('optional') || journey.includes('if you want')) {
      warnings.push(`Journey text suggests optional, but field "${question.label}" is marked as required in schema`);
    }
  }

  // Check if Journey implies required but schema says optional
  if (!question.required) {
    if (journey.includes('required') || journey.includes('must provide')) {
      warnings.push(`Journey text suggests required, but field "${question.label}" is marked as optional in schema`);
    }
  }

  return warnings;
}
