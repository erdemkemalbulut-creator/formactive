import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import type { GenerateConversationRequest, GenerateConversationItem } from '@/lib/types';

const SYSTEM_PROMPT = `You are an expert conversation designer for interactive forms.

Your task is to transform a high-level situation description into a complete, structured conversational form.

You will be given:

* A **form context** describing the situation, goals, and audience
* Desired **tone** and **audience type**

### Your objectives

1. Understand the real-world situation described in the context
2. Identify what information the form creator needs to collect
3. Design a logical, natural conversation that gathers this information efficiently
4. Generate clear, human-friendly questions that feel appropriate for the audience
5. Choose the most suitable question type for each question

### Rules you must follow

* Think in terms of a **conversation**, not a survey
* Questions should follow a natural order (e.g. confirmation → details → preferences)
* Do NOT ask redundant or unnecessary questions
* Use simple, clear language — avoid corporate or robotic phrasing
* Match the requested tone consistently
* Assume respondents are real people, not internal users
* Do NOT include explanations, commentary, or metadata in your response

### Question types you may use

Only use the following types:

* short_text
* long_text
* single_choice
* multiple_choice
* yes_no
* date
* number
* email
* phone

### Output format (strict)

Return ONLY a JSON object with a "questions" array.
Each item in the array must be a question object with this exact shape:

{
  "label": string,
  "type": string,
  "required": boolean,
  "options": string[] | null
}

### Important constraints

* Do NOT invent information not implied by the context
* Do NOT include internal instructions or system language
* Do NOT reference the form creator or the AI
* Do NOT generate more questions than necessary to satisfy the context
* If dates, attendance, preferences, or interest are implied, include them
* If something is optional or sensitive, mark it as not required

Design the conversation so it feels natural, respectful, and easy to answer.`;

function buildUserPrompt(req: GenerateConversationRequest): string {
  let prompt = `Context: "${req.context}"`;
  prompt += `\nTone: ${req.tone}`;
  if (req.audience) {
    prompt += `\nAudience: ${req.audience}`;
  }
  return prompt;
}

function validateItem(data: any): GenerateConversationItem | null {
  if (!data || typeof data !== 'object') return null;
  if (!data.label || !data.type) return null;

  const validTypes = [
    'short_text', 'long_text', 'single_choice', 'multiple_choice',
    'yes_no', 'date', 'number', 'email', 'phone'
  ];
  if (!validTypes.includes(data.type)) {
    data.type = 'short_text';
  }

  return {
    label: String(data.label),
    type: data.type,
    required: Boolean(data.required ?? true),
    options: Array.isArray(data.options) ? data.options.map(String) : null,
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
            content: `Your previous response was invalid. Please try again and return ONLY valid JSON with a "questions" array. Error: ${lastError}`,
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
        const questionsArray = parsed.questions || parsed.nodes || [];

        if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
          lastError = 'Response did not contain a valid questions array';
          continue;
        }

        const validatedItems: GenerateConversationItem[] = [];

        for (const item of questionsArray) {
          const validated = validateItem(item);
          if (validated) {
            validatedItems.push(validated);
          }
        }

        if (validatedItems.length === 0) {
          lastError = 'No valid questions in the response';
          continue;
        }

        return NextResponse.json({ questions: validatedItems });
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
