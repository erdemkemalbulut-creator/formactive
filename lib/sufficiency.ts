/**
 * Semantic Sufficiency Evaluator
 *
 * Determines if a user's answer is sufficiently specific for a field
 * Uses deterministic checks first, then LLM for text fields
 */

import OpenAI from 'openai';
import { ToneContract } from './tone';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SufficiencyInput {
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  required: boolean;
  intent?: string;
  examples?: string[];
  vagueAnswers?: string[];
  userText: string;
  toneContract?: ToneContract;
  journeyInstruction?: string;
  selectOptions?: string[];
}

export interface SufficiencyResult {
  sufficient: boolean;
  normalized?: any;
  reason?: 'vague' | 'offtopic' | 'refusal' | 'invalid_format' | 'empty';
  clarification?: string;
}

const DEFAULT_VAGUE_ANSWERS = [
  'idk', 'i dont know', "i don't know", 'not sure', 'dunno', 'maybe',
  'nothing', 'none', 'n/a', 'na', 'planning', 'thinking', 'undecided',
  'whatever', 'anything', 'everything', 'something', 'stuff', 'things',
  'later', 'soon', 'eventually', 'tbd', 'to be determined', '?', '??', '???'
];

/**
 * Deterministic checks for empty, vague, or format-invalid answers
 */
function deterministicCheck(input: SufficiencyInput): SufficiencyResult | null {
  const text = input.userText.trim().toLowerCase();

  // Empty check
  if (!text || text.length === 0) {
    return {
      sufficient: false,
      reason: 'empty',
      clarification: `Could you share ${input.fieldLabel.toLowerCase()}?`
    };
  }

  // Vague answers check (global + field-specific)
  const allVagueAnswers = [
    ...DEFAULT_VAGUE_ANSWERS,
    ...(input.vagueAnswers || []).map(v => v.toLowerCase())
  ];

  if (allVagueAnswers.includes(text)) {
    const exampleText = input.examples && input.examples.length > 0
      ? ` For example: "${input.examples[0]}"`
      : '';
    return {
      sufficient: false,
      reason: 'vague',
      clarification: `I need a bit more detail here.${exampleText}`
    };
  }

  // Format validation for typed fields
  switch (input.fieldType) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.userText.trim())) {
        return {
          sufficient: false,
          reason: 'invalid_format',
          clarification: 'Please enter a valid email address (e.g., name@example.com)'
        };
      }
      return {
        sufficient: true,
        normalized: input.userText.trim().toLowerCase()
      };

    case 'phone':
      const phoneRegex = /[\d\s\-\(\)\+]{10,}/;
      if (!phoneRegex.test(input.userText)) {
        return {
          sufficient: false,
          reason: 'invalid_format',
          clarification: 'Please enter a valid phone number (e.g., +1 555-123-4567)'
        };
      }
      return {
        sufficient: true,
        normalized: input.userText.trim()
      };

    case 'url':
      try {
        new URL(input.userText.trim());
        return {
          sufficient: true,
          normalized: input.userText.trim()
        };
      } catch {
        return {
          sufficient: false,
          reason: 'invalid_format',
          clarification: 'Please enter a valid URL (e.g., https://example.com)'
        };
      }

    case 'number':
      const num = parseFloat(input.userText.trim());
      if (isNaN(num)) {
        return {
          sufficient: false,
          reason: 'invalid_format',
          clarification: 'Please enter a valid number'
        };
      }
      return {
        sufficient: true,
        normalized: num
      };

    case 'date':
      const date = new Date(input.userText.trim());
      if (isNaN(date.getTime())) {
        return {
          sufficient: false,
          reason: 'invalid_format',
          clarification: 'Please enter a valid date (e.g., 2024-03-15 or March 15, 2024)'
        };
      }
      return {
        sufficient: true,
        normalized: date.toISOString()
      };

    case 'select':
    case 'multiple_choice':
      if (!input.selectOptions || input.selectOptions.length === 0) {
        return null;
      }

      const userLower = text;
      const matchedOptions = input.selectOptions.filter(opt =>
        opt.toLowerCase().includes(userLower) || userLower.includes(opt.toLowerCase())
      );

      if (matchedOptions.length === 0) {
        return {
          sufficient: false,
          reason: 'invalid_format',
          clarification: `Please choose from: ${input.selectOptions.join(', ')}`
        };
      }

      return {
        sufficient: true,
        normalized: matchedOptions
      };
  }

  return null;
}

/**
 * LLM-based sufficiency check for text fields
 */
async function llmSufficiencyCheck(input: SufficiencyInput): Promise<SufficiencyResult> {
  const systemPrompt = `You are a form assistant evaluating if a user's answer is sufficiently specific for a field.

Field context:
- Label: ${input.fieldLabel}
- Intent: ${input.intent || 'Collect this information'}
${input.examples && input.examples.length > 0 ? `- Good examples: ${input.examples.join('; ')}` : ''}

Rules:
1. The answer must be SPECIFIC and INFORMATIVE enough to satisfy the intent
2. Reject vague, off-topic, or refusal answers
3. Accept answers that give useful, relevant information even if brief
4. Do NOT mention schema, validation, or internal rules
5. Return exactly ONE clarification question if insufficient

Examples of insufficient answers:
- Too vague: "planning", "thinking about it", "stuff"
- Off-topic: User talks about something unrelated
- Refusal: "none of your business", "not telling"

Examples of sufficient answers:
- Specific: "Lead capture for inbound marketing"
- Concrete: "We need it for customer onboarding"
- Brief but clear: "Event registration"

Return JSON only with these fields:
{
  "sufficient": boolean,
  "reason": "vague"|"offtopic"|"refusal" (only if insufficient),
  "clarification": "ONE question to ask" (only if insufficient, must be natural and conversational)
}`;

  const userPrompt = `User's answer: "${input.userText}"

Is this sufficiently specific for the field intent? Respond with JSON only.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    const result = JSON.parse(content);

    return {
      sufficient: result.sufficient === true,
      reason: result.reason || undefined,
      clarification: result.clarification || undefined,
      normalized: result.sufficient ? input.userText.trim() : undefined
    };
  } catch (error) {
    console.error('LLM sufficiency check failed:', error);

    // Fallback: accept non-empty answers
    if (input.userText.trim().length >= 3) {
      return {
        sufficient: true,
        normalized: input.userText.trim()
      };
    }

    return {
      sufficient: false,
      reason: 'vague',
      clarification: `Could you provide more detail about ${input.fieldLabel.toLowerCase()}?`
    };
  }
}

/**
 * Main sufficiency evaluator
 * Deterministic checks first, then LLM for text fields
 */
export async function evaluateSufficiency(input: SufficiencyInput): Promise<SufficiencyResult> {
  // Step 1: Deterministic checks (always run first)
  const deterministicResult = deterministicCheck(input);
  if (deterministicResult !== null) {
    return deterministicResult;
  }

  // Step 2: For text/textarea fields, use LLM check if intent is provided
  if ((input.fieldType === 'text' || input.fieldType === 'textarea') && input.intent) {
    return await llmSufficiencyCheck(input);
  }

  // Step 3: Fallback - accept non-empty text
  const text = input.userText.trim();
  if (text.length >= 2) {
    return {
      sufficient: true,
      normalized: text
    };
  }

  return {
    sufficient: false,
    reason: 'vague',
    clarification: `Could you provide more detail about ${input.fieldLabel.toLowerCase()}?`
  };
}

/**
 * Generate escalated clarification based on attempt number
 */
export function generateEscalatedClarification(
  input: SufficiencyInput,
  attemptNumber: number,
  baseResult: SufficiencyResult
): string {
  const tonePreset = input.toneContract?.preset || 'casual';

  if (attemptNumber === 1) {
    // Gentle clarification
    return baseResult.clarification || `Could you provide more detail about ${input.fieldLabel.toLowerCase()}?`;
  }

  if (attemptNumber === 2) {
    // More direct + example
    const exampleText = input.examples && input.examples.length > 0
      ? ` For example: "${input.examples[0]}"`
      : '';

    if (tonePreset === 'professional') {
      return `I require a more specific answer for ${input.fieldLabel.toLowerCase()}.${exampleText}`;
    } else if (tonePreset === 'energetic' || tonePreset === 'sassy') {
      return `I really need a bit more detail here!${exampleText}`;
    } else {
      return `I need a more specific answer.${exampleText}`;
    }
  }

  // Attempt 3+: Final warning
  if (input.required) {
    if (tonePreset === 'professional') {
      return `I cannot proceed without this information. Would you like to provide ${input.fieldLabel.toLowerCase()}, or would you prefer to end the conversation?`;
    } else if (tonePreset === 'energetic' || tonePreset === 'sassy') {
      return `I really can't continue without this info. Can you share ${input.fieldLabel.toLowerCase()}, or should we wrap up?`;
    } else {
      return `I can't continue without ${input.fieldLabel.toLowerCase()}. Can you provide it, or should we end here?`;
    }
  } else {
    if (tonePreset === 'professional') {
      return `Would you like to skip this question and move forward?`;
    } else if (tonePreset === 'energetic' || tonePreset === 'sassy') {
      return `No worries! Want to skip this one?`;
    } else {
      return `Want to skip this question?`;
    }
  }
}

/**
 * Check if user is confirming skip
 */
export function isSkipConfirmation(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return ['skip', 'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'y'].includes(lower);
}

/**
 * Check if user wants to end conversation
 */
export function isEndConfirmation(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return ['end', 'quit', 'stop', 'exit', 'done', 'no', 'nope', 'cancel'].includes(lower);
}
