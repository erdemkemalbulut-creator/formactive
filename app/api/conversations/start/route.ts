import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Verify environment variables exist
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
      console.error('[Conversation Start] NEXT_PUBLIC_SUPABASE_URL is missing');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 500 }
      );
    }

    if (!serviceKey) {
      console.error('[Conversation Start] Service role key is missing');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 500 }
      );
    }

    console.log('[Conversation Start] Environment check passed');

    const supabase = createClient(
      url,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { formId, slug } = await request.json();

    console.log('[Conversation Start] Request:', { formId, slug });

    if (!formId && !slug) {
      console.error('[Conversation Start] Missing formId or slug');
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Fetch the form
    let query = supabase.from('forms').select('*');

    if (formId) {
      query = query.eq('id', formId);
    } else {
      query = query.eq('slug', slug);
    }

    const { data: form, error: formError } = await query
      .eq('is_published', true)
      .single();

    if (formError) {
      console.error('[Conversation Start] Supabase form error:', formError);
      return NextResponse.json(
        { error: 'Form not available' },
        { status: 404 }
      );
    }

    if (!form) {
      console.error('[Conversation Start] Form not found');
      return NextResponse.json(
        { error: 'Form not available' },
        { status: 404 }
      );
    }

    console.log('[Conversation Start] Form found:', { id: form.id, name: form.name, slug: form.slug });

    if (!form.data_fields || !Array.isArray(form.data_fields) || form.data_fields.length === 0) {
      console.error('[Conversation Start] Form has no data fields:', form.id);
      return NextResponse.json(
        { error: 'Form is not properly configured' },
        { status: 400 }
      );
    }

    console.log('[Conversation Start] Form validated, creating conversation...');

    // Create conversation
    const now = new Date().toISOString();
    const insertPayload = {
      form_id: form.id,
      status: 'in_progress',
      last_activity_at: now,
    };

    console.log('[Conversation Start] Insert payload:', insertPayload);

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert(insertPayload)
      .select()
      .single();

    if (convError) {
      console.error('[Conversation Start] Supabase conversation error:', convError);
      return NextResponse.json(
        { error: 'Unable to start conversation' },
        { status: 500 }
      );
    }

    if (!conversation) {
      console.error('[Conversation Start] No conversation returned');
      return NextResponse.json(
        { error: 'Unable to start conversation' },
        { status: 500 }
      );
    }

    console.log('[Conversation Start] ✅ Conversation created:', conversation);

    // Generate the first AI message
    const firstField = form.data_fields[0];
    const systemPrompt = form.system_prompt || `You are a friendly form assistant helping users fill out ${form.name}. Ask one question at a time, be conversational and warm.`;

    console.log('[Conversation Start] Generating first message...');
    const firstMessage = await generateFirstMessage(systemPrompt, form.name, firstField.label || firstField.name);

    // Save the first message
    const { data: savedMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: firstMessage
      })
      .select()
      .single();

    if (messageError) {
      console.error('[Conversation Start] Failed to save first message:', messageError);
      return NextResponse.json(
        { error: 'Unable to initialize conversation' },
        { status: 500 }
      );
    }

    console.log('[Conversation Start] ✅ First message saved');

    // Calculate progress
    const progress = {
      current: 0,
      total: form.data_fields.length,
      percentage: 0
    };

    // Return success with message
    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      message: firstMessage,
      progress: progress,
      conversation: conversation,
      form: {
        id: form.id,
        name: form.name,
        slug: form.slug
      }
    });

  } catch (error: any) {
    console.error('[Conversation Start] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unable to start conversation' },
      { status: 500 }
    );
  }
}

async function generateFirstMessage(systemPrompt: string, formName: string, firstFieldName: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.log('[Conversation Start] No valid OpenAI API key, using fallback');
    return `Hello! Thanks for taking the time to fill out ${formName}. Let's get started - what is your ${firstFieldName}?`;
  }

  try {
    console.log('[Conversation Start] Calling OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Start the conversation' },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Conversation Start] OpenAI API error:', {
        status: response.status,
        error: errorText,
      });
      throw new Error('OpenAI API failed');
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('[Conversation Start] OpenAI returned no content');
      throw new Error('OpenAI returned no content');
    }

    console.log('[Conversation Start] OpenAI response received');
    return aiResponse;
  } catch (error) {
    console.error('[Conversation Start] LLM call failed, using fallback:', error);
    return `Hello! Thanks for taking the time to fill out ${formName}. Let's get started - what is your ${firstFieldName}?`;
  }
}
