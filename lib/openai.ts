import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAI(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing ANTHROPIC_API_KEY environment variable.');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Helper to call Claude with a system prompt and user message, returning text.
 */
export async function chatCompletion(opts: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const client = getAI();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: opts.maxTokens || 1024,
    system: opts.system,
    messages: [{ role: 'user', content: opts.userMessage }],
    temperature: opts.temperature,
  });

  const block = response.content[0];
  if (block.type === 'text') {
    return block.text;
  }
  return '';
}

/**
 * Helper to call Claude and get JSON back.
 */
export async function chatCompletionJSON<T = any>(opts: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<T> {
  const text = await chatCompletion({
    ...opts,
    system: opts.system + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no extra text.',
  });

  const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}
