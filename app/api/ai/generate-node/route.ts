import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, chatCompletionJSON } from '@/lib/openai';
import type { GenerateWordingRequest } from '@/lib/types';

const GENERATE_PROMPT = `You are a conversational interface speaking directly to an end user who is answering a guided interaction.

You are NOT assisting the form creator.
You are NOT allowed to ask configuration, product, or meta questions.

You will be given:

* A global conversation description (for background only)
* A tone of voice
* ONE journey item describing what to ask or say to the respondent

### Your task

Turn the journey item into a single message shown to the respondent.

### Absolute rules

* Speak ONLY to the respondent
* NEVER ask questions about how the form works
* NEVER ask questions to clarify instructions
* NEVER reference the form, the system, the AI, or the creator
* NEVER introduce new topics beyond the journey item
* Produce exactly ONE message per step

### Message guidelines

* If the journey item is a question, ask it naturally
* If the journey item is an instruction, present it clearly
* Use simple, human language
* Match the selected tone of voice
* Be neutral and professional for sensitive inputs (email, phone, company name)

### Output

Return ONLY the message text shown to the respondent.
No explanations. No formatting. No metadata.`;

const VALIDATE_PROMPT = `You are a strict validator for respondent-facing conversational steps.

You will be given:

* global_description: string
* tone_of_voice: string
* journey_item: string
* candidate_message: string (the message that will be shown to the respondent)

Your job is to validate the candidate_message and, only if necessary, propose a minimal correction.

### What a valid candidate_message must satisfy

1. It speaks ONLY to the respondent (end user).
2. It is about the journey_item only (no new topics).
3. It does NOT ask meta questions about the form, the system, configuration, or how the builder works.
4. It does NOT mention AI, system prompts, models, tools, form creator, or internal rules.
5. It contains exactly ONE step: either a single question or a single instruction.
6. It matches the tone_of_voice (within reason) and stays neutral for sensitive inputs (email, phone, company name).
7. It is concise and clear.

### Output format (STRICT)

Return ONLY valid JSON with this exact shape:

{
"ok": boolean,
"reason": string,
"fixed_message": string|null
}

No additional keys. No markdown. No commentary.`;

function buildUserPrompt(req: GenerateWordingRequest): string {
  let prompt = `Global description: "${req.description}"`;
  prompt += `\nTone: ${req.tone}`;
  prompt += `\nFull journey: ${req.journeyItems.map((item, i) => `${i + 1}. ${item.label} (${item.type})`).join(', ')}`;
  prompt += `\nCurrent journey item to generate: "${req.currentItem.label}" (type: ${req.currentItem.type})`;
  return prompt;
}

function buildValidatePrompt(description: string, tone: string, journeyItem: string, candidateMessage: string): string {
  return `global_description: "${description}"
tone_of_voice: "${tone}"
journey_item: "${journeyItem}"
candidate_message: "${candidateMessage}"`;
}

async function generateMessage(req: GenerateWordingRequest): Promise<string> {
  const userPrompt = buildUserPrompt(req);

  for (let attempt = 0; attempt < 2; attempt++) {
    let message = userPrompt;
    if (attempt === 1) {
      message += `\n\nYour previous response was empty. Please return ONLY the message text for the respondent. No JSON, no formatting.`;
    }

    const content = await chatCompletion({
      system: GENERATE_PROMPT,
      userMessage: message,
      maxTokens: 500,
      temperature: 0.7,
    });

    if (content.trim()) return content.trim();
  }

  throw new Error('Failed to generate wording after retries');
}

async function validateMessage(description: string, tone: string, journeyItem: string, candidateMessage: string): Promise<string> {
  const userPrompt = buildValidatePrompt(description, tone, journeyItem, candidateMessage);

  try {
    const result = await chatCompletionJSON<{ ok: boolean; reason: string; fixed_message: string | null }>({
      system: VALIDATE_PROMPT,
      userMessage: userPrompt,
      maxTokens: 300,
      temperature: 0,
    });

    if (result.ok === true) {
      return candidateMessage;
    }

    if (result.fixed_message && typeof result.fixed_message === 'string') {
      return result.fixed_message;
    }

    return candidateMessage;
  } catch {
    return candidateMessage;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateWordingRequest = await request.json();

    if (!body.currentItem?.label) {
      return NextResponse.json({ error: 'Current item label is required' }, { status: 400 });
    }

    const description = body.description || '';
    const tone = body.tone || 'friendly';
    const journeyItems = body.journeyItems || [];
    const currentItem = body.currentItem;

    const candidate = await generateMessage({
      description,
      tone,
      journeyItems,
      currentItem,
    });

    const validated = await validateMessage(
      description,
      tone,
      currentItem.label,
      candidate
    );

    return NextResponse.json({ message: validated });
  } catch (error: any) {
    console.error('Generate wording error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate wording' },
      { status: 500 }
    );
  }
}
