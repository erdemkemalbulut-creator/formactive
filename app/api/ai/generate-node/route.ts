import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import type { GenerateWordingRequest } from '@/lib/types';

const SYSTEM_PROMPT = `You are a conversational interface speaking directly to an end user who is answering a guided interaction.

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

### Correction behavior

* If unrealistic answers are expected (e.g. age, number), gently guide without joking unless tone allows it
* Do not validate answers unless explicitly implied

### Output

Return ONLY the message text shown to the respondent.
No explanations.
No formatting.
No metadata.`;

function buildUserPrompt(req: GenerateWordingRequest): string {
  let prompt = `Global description: "${req.description}"`;
  prompt += `\nTone: ${req.tone}`;
  prompt += `\nFull journey: ${req.journeyItems.map((item, i) => `${i + 1}. ${item.label} (${item.type})`).join(', ')}`;
  prompt += `\nCurrent journey item to generate: "${req.currentItem.label}" (type: ${req.currentItem.type})`;
  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateWordingRequest = await request.json();

    if (!body.currentItem?.label) {
      return NextResponse.json({ error: 'Current item label is required' }, { status: 400 });
    }

    const userPrompt = buildUserPrompt({
      description: body.description || '',
      tone: body.tone || 'friendly',
      journeyItems: body.journeyItems || [],
      currentItem: body.currentItem,
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
            content: `Your previous response was empty. Please return ONLY the message text for the respondent. No JSON, no formatting.`,
          });
        }

        const completion = await openai.chat.completions.create({
          model: 'gpt-4.1',
          messages,
          temperature: 0.7,
          max_tokens: 500,
        });

        const content = completion.choices[0]?.message?.content?.trim();
        if (!content) {
          lastError = 'Empty response from AI';
          continue;
        }

        return NextResponse.json({ message: content });
      } catch (err: any) {
        lastError = err.message;
        if (attempt === 1) throw err;
      }
    }

    return NextResponse.json({ error: 'Failed to generate wording after retries' }, { status: 500 });
  } catch (error: any) {
    console.error('Generate wording error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate wording' },
      { status: 500 }
    );
  }
}
