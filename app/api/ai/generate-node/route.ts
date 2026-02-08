import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import type { GenerateNodeRequest, GenerateNodeResponse } from '@/lib/types';

const SYSTEM_PROMPT = `You are an expert conversational form designer. Given a form creator's intent (what they want to learn from a respondent), generate a conversation node that feels natural and friendly.

You MUST return ONLY valid JSON matching this exact schema:

{
  "field_key": "snake_case_key_for_data_storage",
  "data_type": "string|number|boolean|date|email|phone|categorical|rating",
  "ui_type": "short_text|long_text|email|phone|number|date|time|dropdown|multi_select|checkbox|yes_no|rating|file_upload|consent",
  "user_prompt": "The conversational question shown to the respondent",
  "transition_before": "A short, warm bridge message (1 sentence) to transition into this question",
  "required": true/false,
  "validation": {
    "minLength": number or omit,
    "maxLength": number or omit,
    "min": number or omit,
    "max": number or omit,
    "pattern": "regex string or omit",
    "allowedValues": ["array", "of", "strings"] or omit
  },
  "options": [{"id": "unique_id", "label": "Display Label", "value": "stored_value"}] (only for dropdown/multi_select, otherwise empty array),
  "extraction": {"type": "the_data_type", "description": "what this field captures"},
  "followups": [
    {
      "id": "unique_id",
      "condition": {"field_key": "this_field_key", "operator": "empty", "value": ""},
      "prompt": "A clarifying follow-up question if the answer is unclear",
      "field_key": "followup_field_key",
      "data_type": "string",
      "ui_type": "short_text"
    }
  ]
}

Guidelines:
- user_prompt should be conversational, warm, and match the requested tone
- transition_before should acknowledge previous context and bridge naturally (e.g., "Great, now let's talk about...", "Thanks for that!")
- field_key should be descriptive and snake_case
- Choose the most appropriate ui_type for the intent
- Only add followups when genuinely useful (max 1-2)
- For dropdown/multi_select, generate 3-7 relevant options
- validation should be sensible defaults based on data type
- Do NOT wrap the JSON in markdown code blocks`;

function buildUserPrompt(req: GenerateNodeRequest): string {
  let prompt = `Intent: "${req.intent}"`;
  prompt += `\nTone: ${req.tone}`;
  prompt += `\nDirectness: ${req.directness}`;
  if (req.audience) {
    prompt += `\nTarget audience: ${req.audience}`;
  }
  if (req.existing_fields.length > 0) {
    prompt += `\nExisting fields in this form: ${req.existing_fields.join(', ')}`;
    prompt += `\nMake sure the field_key is unique and doesn't conflict with existing fields.`;
  }
  return prompt;
}

function validateResponse(data: any): GenerateNodeResponse | null {
  if (!data || typeof data !== 'object') return null;
  if (!data.field_key || !data.data_type || !data.ui_type || !data.user_prompt) return null;

  const validUiTypes = [
    'short_text', 'long_text', 'email', 'phone', 'number', 'date', 'time',
    'dropdown', 'multi_select', 'checkbox', 'yes_no', 'rating', 'file_upload', 'consent'
  ];
  if (!validUiTypes.includes(data.ui_type)) {
    data.ui_type = 'short_text';
  }

  return {
    field_key: String(data.field_key),
    data_type: data.data_type,
    ui_type: data.ui_type,
    user_prompt: String(data.user_prompt),
    transition_before: String(data.transition_before || ''),
    required: Boolean(data.required ?? true),
    validation: data.validation || {},
    options: Array.isArray(data.options) ? data.options : [],
    extraction: data.extraction || {},
    followups: Array.isArray(data.followups) ? data.followups : [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateNodeRequest = await request.json();

    if (!body.intent || body.intent.trim().length === 0) {
      return NextResponse.json({ error: 'Intent is required' }, { status: 400 });
    }

    const userPrompt = buildUserPrompt({
      intent: body.intent,
      tone: body.tone || 'friendly',
      directness: body.directness || 'balanced',
      audience: body.audience,
      existing_fields: body.existing_fields || [],
    });

    let lastError: any = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const messages: any[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ];

        if (attempt === 1 && lastError) {
          messages.push({
            role: 'user',
            content: `Your previous response was invalid JSON. Please try again and return ONLY valid JSON matching the schema. Error: ${lastError}`,
          });
        }

        const completion = await openai.chat.completions.create({
          model: 'gpt-4.1',
          messages,
          temperature: 0.7,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          lastError = 'Empty response from AI';
          continue;
        }

        const parsed = JSON.parse(content);
        const validated = validateResponse(parsed);

        if (!validated) {
          lastError = 'Response did not match expected schema';
          continue;
        }

        return NextResponse.json(validated);
      } catch (parseError: any) {
        lastError = parseError.message;
        if (attempt === 1) throw parseError;
      }
    }

    return NextResponse.json({ error: 'Failed to generate valid node after retries' }, { status: 500 });
  } catch (error: any) {
    console.error('Generate node error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate conversation node' },
      { status: 500 }
    );
  }
}
