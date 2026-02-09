import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import type { GenerateConversationRequest, GenerateNodeResponse } from '@/lib/types';

const SYSTEM_PROMPT = `You are an expert conversational form designer. Given a form creator's context describing their situation and what they need to learn from respondents, generate a complete conversation flow as an array of conversation nodes.

You MUST return ONLY valid JSON with this exact structure:

{
  "nodes": [
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
      "options": [{"id": "unique_id", "label": "Display Label", "value": "stored_value"}],
      "extraction": {"type": "the_data_type", "description": "what this field captures"},
      "followups": []
    }
  ]
}

Guidelines:
- Analyze the context to determine ALL questions needed to fulfill the creator's intent
- Order questions in a natural conversational flow (easy/warm questions first, detailed ones later)
- The first question should NOT have a transition_before (it's the opening)
- Each subsequent question should have a transition_before that acknowledges what came before and flows naturally
- user_prompt should be conversational, warm, and match the requested tone
- field_key must be unique and descriptive (snake_case)
- Choose the most appropriate ui_type for each piece of information
- For dropdown/multi_select, generate 3-7 relevant options
- Generate between 3-10 questions depending on the complexity of the context
- End with a consent or confirmation question if appropriate
- validation should be sensible defaults based on data type
- Only add followups when genuinely useful (max 1-2 per node)
- Do NOT wrap the JSON in markdown code blocks`;

function buildUserPrompt(req: GenerateConversationRequest): string {
  let prompt = `Context: "${req.context}"`;
  prompt += `\nTone: ${req.tone}`;
  prompt += `\nDirectness: ${req.directness}`;
  if (req.audience) {
    prompt += `\nTarget audience: ${req.audience}`;
  }
  return prompt;
}

function validateNode(data: any): GenerateNodeResponse | null {
  if (!data || typeof data !== 'object') return null;
  if (!data.field_key || !data.data_type || !data.ui_type || !data.user_prompt) return null;

  const validUiTypes = [
    'short_text', 'long_text', 'email', 'phone', 'number', 'date', 'time',
    'dropdown', 'multi_select', 'checkbox', 'yes_no', 'rating', 'file_upload', 'consent'
  ];
  if (!validUiTypes.includes(data.ui_type)) {
    data.ui_type = 'short_text';
  }

  const validDataTypes = ['string', 'number', 'boolean', 'date', 'email', 'phone', 'categorical', 'rating'];
  if (!validDataTypes.includes(data.data_type)) {
    data.data_type = 'string';
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
    const body: GenerateConversationRequest = await request.json();

    if (!body.context || body.context.trim().length === 0) {
      return NextResponse.json({ error: 'Context is required' }, { status: 400 });
    }

    const userPrompt = buildUserPrompt({
      context: body.context,
      tone: body.tone || 'friendly',
      directness: body.directness || 'balanced',
      audience: body.audience,
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
            content: `Your previous response was invalid. Please try again and return ONLY valid JSON with a "nodes" array. Error: ${lastError}`,
          });
        }

        const completion = await openai.chat.completions.create({
          model: 'gpt-4.1',
          messages,
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          lastError = 'Empty response from AI';
          continue;
        }

        const parsed = JSON.parse(content);
        const nodesArray = parsed.nodes || parsed.questions || [];

        if (!Array.isArray(nodesArray) || nodesArray.length === 0) {
          lastError = 'Response did not contain a valid nodes array';
          continue;
        }

        const validatedNodes: GenerateNodeResponse[] = [];
        const seenKeys = new Set<string>();

        for (const node of nodesArray) {
          const validated = validateNode(node);
          if (validated) {
            if (seenKeys.has(validated.field_key)) {
              validated.field_key = `${validated.field_key}_${validatedNodes.length}`;
            }
            seenKeys.add(validated.field_key);
            validatedNodes.push(validated);
          }
        }

        if (validatedNodes.length === 0) {
          lastError = 'No valid nodes in the response';
          continue;
        }

        return NextResponse.json({ nodes: validatedNodes });
      } catch (parseError: any) {
        lastError = parseError.message;
        if (attempt === 1) throw parseError;
      }
    }

    return NextResponse.json({ error: 'Failed to generate conversation after retries' }, { status: 500 });
  } catch (error: any) {
    console.error('Generate conversation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate conversation' },
      { status: 500 }
    );
  }
}
