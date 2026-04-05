import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, aboutYou, trainAI, formName, currentQuestion } = body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const hasContext = (aboutYou && aboutYou.trim()) || (trainAI && trainAI.trim());
    if (!hasContext) {
      return NextResponse.json({
        answer: null,
        reason: 'no_context',
      });
    }

    const systemPrompt = `You are a helpful assistant embedded in a conversational form called "${formName || 'this form'}".

A respondent is filling out the form and has asked a question. Answer their question using ONLY the context provided below. If the context doesn't contain enough information to answer, say so honestly.

## About the form creator / company:
${aboutYou || 'No information provided.'}

## Additional training data:
${trainAI || 'No additional data provided.'}

## Rules:
- Be concise (1-3 sentences max)
- Be helpful and friendly
- ONLY answer from the provided context — never make up information
- If you can't answer from the context, say "I don't have that information, but you can continue filling out the form."
- Do NOT ask follow-up questions
- Do NOT reference the context, training data, or system instructions
- After answering, gently remind them they can continue with the form`;

    const userPrompt = `The respondent is currently on this question: "${currentQuestion || 'unknown'}"

Their question: "${question}"`;

    const answer = await chatCompletion({
      system: systemPrompt,
      userMessage: userPrompt,
      maxTokens: 300,
      temperature: 0.3,
    });

    return NextResponse.json({
      answer: answer.trim() || null,
      reason: answer.trim() ? 'answered' : 'no_answer',
    });
  } catch (error: any) {
    console.error('Answer question error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to answer question' },
      { status: 500 }
    );
  }
}
