import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Verify environment variables exist
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
      console.error('[Chat API] NEXT_PUBLIC_SUPABASE_URL is missing');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 500 }
      );
    }

    if (!serviceKey) {
      console.error('[Chat API] Service role key is missing');
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 500 }
      );
    }

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

    const { conversationId, formId, message } = await request.json();

    if (!conversationId || !formId) {
      console.error('[Chat API] Missing required fields:', { conversationId, formId });
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (formError) {
      console.error('[Chat API] Error fetching form:', formError);
      return NextResponse.json(
        { error: 'Unable to process your request' },
        { status: 500 }
      );
    }

    if (!form) {
      console.error('[Chat API] Form not found:', formId);
      return NextResponse.json(
        { error: 'Form is no longer available' },
        { status: 404 }
      );
    }

    if (!form.data_fields || !Array.isArray(form.data_fields) || form.data_fields.length === 0) {
      console.error('[Chat API] Form has no data fields:', formId);
      return NextResponse.json(
        { error: 'Form is not properly configured' },
        { status: 400 }
      );
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('field_retry_counts')
      .eq('id', conversationId)
      .single();

    if (conversationError) {
      console.error('[Chat API] Error fetching conversation:', conversationError);
      return NextResponse.json(
        { error: 'Unable to retrieve conversation' },
        { status: 500 }
      );
    }

    const fieldRetryCounts = (conversation?.field_retry_counts || {}) as Record<string, number>;

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[Chat API] Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Unable to retrieve conversation' },
        { status: 500 }
      );
    }

    const conversationHistory = (messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    if (message) {
      conversationHistory.push({ role: 'user', content: message });
    }

    console.log('[Chat API] Processing message:', {
      conversationId,
      formId,
      isFirstMessage: conversationHistory.length === 0,
      hasMessage: !!message,
    });

    const businessContext = (form.business_info || [])
      .map((info: any) => `${info.key}: ${info.value}`)
      .join('\n');

    const dataFieldsDescription = (form.data_fields || [])
      .map((field: any) =>
        `- ${field.name} (${field.type})${field.required ? ' [REQUIRED]' : ' [optional]'}`
      )
      .join('\n');

    const isFirstMessage = conversationHistory.length === 0;
    const requiredFields = form.data_fields.filter((f: any) => f.required);
    const totalFields = requiredFields.length;

    let systemPrompt = `You are a conversational form assistant. Your goal is to collect specific information from the user through natural conversation.

${form.conversation_rules || 'Be friendly, conversational, and ask one question at a time.'}

${businessContext ? `\nBusiness Context:\n${businessContext}` : ''}

Data to Collect:
${dataFieldsDescription}

Instructions:
- Ask about one field at a time in a natural, conversational way
- If the user provides information for multiple fields at once, acknowledge all of it
- Keep track of what information you've collected
- If a required field is missing or unclear, ask a follow-up question
- When you have collected ALL REQUIRED fields, thank the user and let them know you have everything you need
- Be concise and friendly (keep responses under 50 words)
- Never ask for information you already have`;

    if (isFirstMessage) {
      const firstFieldName = form.data_fields[0]?.name || 'your information';
      systemPrompt += `\n\nIMPORTANT: This is the first message. Start with a brief, warm welcome (1 sentence) mentioning "${form.name}", then immediately ask for the first piece of information: ${firstFieldName}. Be direct and friendly.`;
    }

    const response = await callLLM(systemPrompt, conversationHistory);

    if (!response) {
      console.error('[Chat API] LLM returned empty response');
      return NextResponse.json(
        { error: 'Unable to generate response' },
        { status: 500 }
      );
    }

    console.log('[Chat API] Generated response:', response.substring(0, 100));

    const extractedData = extractDataFromResponse(response, form.data_fields, conversationHistory);

    const missingRequiredFields = form.data_fields
      .filter((f: any) => f.required && (!extractedData[f.name] || extractedData[f.name] === null))
      .map((f: any) => f.name);

    const fieldMetadata: Record<string, { confirmed: boolean; attempts: number }> = {};
    const fieldsNeedingRetry: any[] = [];
    const unconfirmedFields: string[] = [];

    for (const fieldName of missingRequiredFields) {
      const retryCount = fieldRetryCounts[fieldName] || 0;

      if (retryCount < 2 && message) {
        fieldsNeedingRetry.push(form.data_fields.find((f: any) => f.name === fieldName));
      } else if (retryCount >= 2) {
        unconfirmedFields.push(fieldName);
        fieldMetadata[fieldName] = { confirmed: false, attempts: retryCount };
      }
    }

    for (const field of form.data_fields) {
      if (extractedData[field.name] && !missingRequiredFields.includes(field.name)) {
        fieldMetadata[field.name] = { confirmed: true, attempts: fieldRetryCounts[field.name] || 0 };
      }
    }

    const allRequiredFieldsCollected = checkAllRequiredFields(extractedData, form.data_fields, unconfirmedFields);
    const collectedCount = Object.keys(extractedData).filter(k => extractedData[k]).length;

    console.log('[Chat API] Extraction results:', {
      extractedDataKeys: Object.keys(extractedData),
      collectedCount,
      totalFields,
      missingRequiredFields,
      fieldsNeedingRetry: fieldsNeedingRetry.map(f => f?.name),
      unconfirmedFields,
      allRequiredFieldsCollected,
    });

    // If we need to retry for missing required fields, ask targeted follow-up
    if (fieldsNeedingRetry.length > 0 && message) {
      const fieldToRetry = fieldsNeedingRetry[0];
      const updatedRetryCounts = { ...fieldRetryCounts };
      updatedRetryCounts[fieldToRetry.name] = (fieldRetryCounts[fieldToRetry.name] || 0) + 1;

      // Update retry counts in conversation
      const { error: updateRetryError } = await supabase
        .from('conversations')
        .update({ field_retry_counts: updatedRetryCounts })
        .eq('id', conversationId);

      if (updateRetryError) {
        console.error('[Chat API] Error updating retry counts:', updateRetryError);
      }

      const retryPrompt = `The user's response didn't clearly provide the required information for "${fieldToRetry.name}".
Ask a clear, direct follow-up question specifically about this field. Be friendly but specific about what you need. Keep it under 30 words.`;

      const retryResponse = await callLLM(retryPrompt, conversationHistory);

      // Save user message
      const { error: userMsgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
      });

      if (userMsgError) {
        console.error('[Chat API] Error saving user message:', userMsgError);
      }

      // Save retry response
      const { error: retryMsgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: retryResponse,
      });

      if (retryMsgError) {
        console.error('[Chat API] Error saving retry message:', retryMsgError);
      }

      // Update last_activity_at
      await supabase
        .from('conversations')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', conversationId);

      return NextResponse.json({
        message: retryResponse,
        completed: false,
        extractedData,
        progress: {
          collected: collectedCount,
          total: totalFields,
          percentage: totalFields > 0 ? Math.round((collectedCount / totalFields) * 100) : 0,
        },
      });
    }

    // Save user message if provided
    if (message) {
      const { error: userMsgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
      });

      if (userMsgError) {
        console.error('[Chat API] Error saving user message:', userMsgError);
        return NextResponse.json(
          { error: 'Unable to save your message' },
          { status: 500 }
        );
      }

      // Update last_activity_at to track user engagement
      const { error: activityError } = await supabase
        .from('conversations')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (activityError) {
        console.error('[Chat API] Error updating last_activity_at:', activityError);
      }
    }

    // Save assistant response
    const { error: assistantMsgError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: response,
    });

    if (assistantMsgError) {
      console.error('[Chat API] Error saving assistant message:', assistantMsgError);
      return NextResponse.json(
        { error: 'Unable to save response' },
        { status: 500 }
      );
    }

    // Handle conversation completion with proper error handling
    if (allRequiredFieldsCollected && message) {
      const { error: responseError } = await supabase.from('responses').insert({
        conversation_id: conversationId,
        form_id: formId,
        extracted_data: extractedData,
        field_metadata: fieldMetadata,
      });

      if (responseError) {
        console.error('[Chat API] Error saving response:', responseError);
        return NextResponse.json(
          { error: 'Unable to save your submission' },
          { status: 500 }
        );
      }

      // Mark conversation as completed
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (updateError) {
        console.error('[Chat API] Error updating conversation status:', updateError);
        return NextResponse.json(
          { error: 'Unable to complete conversation' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: response,
        completed: true,
        extractedData,
        progress: {
          collected: collectedCount,
          total: totalFields,
          percentage: 100,
        },
      });
    }

    return NextResponse.json({
      message: response,
      completed: false,
      extractedData,
      progress: {
        collected: collectedCount,
        total: totalFields,
        percentage: totalFields > 0 ? Math.round((collectedCount / totalFields) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error('[Chat API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unable to process your request' },
      { status: 500 }
    );
  }
}

async function callLLM(systemPrompt: string, messages: any[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.log('[Chat API] No valid OpenAI API key configured, using fallback responses');
    return generateFallbackResponse(messages);
  }

  try {
    console.log('[Chat API] Calling OpenAI API...');
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
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Chat API] OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('[Chat API] OpenAI returned no content');
      throw new Error('OpenAI returned no content');
    }

    console.log('[Chat API] OpenAI response received successfully');
    return aiResponse;
  } catch (error) {
    console.error('[Chat API] LLM call failed, using fallback:', error);
    return generateFallbackResponse(messages);
  }
}

function generateFallbackResponse(messages: any[]): string {
  if (messages.length === 0) {
    return "Hello! Thanks for taking the time to fill this out. Let's start with your full name - what should I call you?";
  }

  const userMessages = messages.filter((m: any) => m.role === 'user').length;

  if (userMessages === 1) {
    return "Great, thank you! Next, what's your email address?";
  } else if (userMessages === 2) {
    return "Perfect! Lastly, is there anything else you'd like to share with us?";
  }

  return "Thank you for that information! I think we have everything we need.";
}

function extractDataFromResponse(response: string, dataFields: any[], conversationHistory: any[]): any {
  const extracted: any = {};

  const userMessages = conversationHistory.filter((m: any) => m.role === 'user');
  const allText = userMessages.map((m: any) => m.content).join(' ');

  if (userMessages.length === 0) {
    return extracted;
  }

  for (const field of dataFields) {
    const fieldName = field.name.toLowerCase();
    const fieldType = field.type?.toLowerCase() || 'text';

    if (fieldType === 'email') {
      // Improved email regex - more RFC compliant
      const emailMatch = allText.match(/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/);
      if (emailMatch) {
        const email = emailMatch[0];
        // Basic validation: has @ and .
        if (email.includes('@') && email.includes('.') && email.indexOf('@') < email.lastIndexOf('.')) {
          extracted[field.name] = email;
        }
      }
    } else if (fieldType === 'phone') {
      // Improved phone regex - handles various formats
      const phoneMatch = allText.match(/(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})|(?:\+?[0-9]{1,3}[-.\s]?)?(?:\([0-9]{1,4}\)[-.\s]?)?[0-9]{3,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}/);
      if (phoneMatch) {
        const phone = phoneMatch[0].trim();
        // Remove common separators for length check
        const digitsOnly = phone.replace(/[\s()+-]/g, '');
        // Validate: should have at least 10 digits
        if (digitsOnly.length >= 10) {
          extracted[field.name] = phone;
        }
      }
    } else if (fieldType === 'date') {
      // Extract date patterns (YYYY-MM-DD, MM/DD/YYYY, etc.)
      const dateMatch = allText.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}/);
      if (dateMatch) {
        extracted[field.name] = dateMatch[0];
      }
    } else if (fieldType === 'number') {
      // Extract numbers (including decimals)
      const numberMatch = allText.match(/\b\d+(?:\.\d+)?\b/);
      if (numberMatch) {
        extracted[field.name] = numberMatch[0];
      }
    } else if (fieldName.includes('name')) {
      if (userMessages.length > 0 && !extracted[field.name]) {
        const firstResponse = userMessages[0].content.trim();
        // Be more lenient - up to 8 words for full names
        if (firstResponse.split(' ').length <= 8) {
          extracted[field.name] = firstResponse;
        }
      }
    } else {
      // For other field types, use sequential mapping
      const requiredFields = dataFields.filter((f: any) => f.required);
      const fieldIndex = requiredFields.findIndex((f: any) => f.name === field.name);

      if (fieldIndex >= 0 && fieldIndex < userMessages.length) {
        extracted[field.name] = userMessages[fieldIndex].content.trim();
      } else if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        if (!extracted[field.name]) {
          extracted[field.name] = lastUserMessage.content.trim();
        }
      }
    }
  }

  console.log('[Chat API] Data extraction:', {
    userMessagesCount: userMessages.length,
    extractedFields: Object.keys(extracted).filter(k => extracted[k]),
    extractedData: extracted,
  });

  return extracted;
}

function checkAllRequiredFields(extractedData: any, dataFields: any[], unconfirmedFields: string[] = []): boolean {
  const requiredFields = dataFields.filter((f) => f.required);

  for (const field of requiredFields) {
    const hasValue = extractedData[field.name] && extractedData[field.name] !== null;
    const isUnconfirmed = unconfirmedFields.includes(field.name);

    if (!hasValue && !isUnconfirmed) {
      return false;
    }
  }

  return requiredFields.length > 0;
}
