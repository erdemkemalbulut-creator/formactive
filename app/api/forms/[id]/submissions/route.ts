import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getAnonClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getAnonClient();

    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, status, is_published')
      .eq('id', params.id)
      .eq('is_published', true)
      .maybeSingle();

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    if (form.status !== 'live') {
      return NextResponse.json(
        { error: 'Form is not accepting submissions' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { answers } = body;

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { error: 'Answers are required' },
        { status: 400 }
      );
    }

    const { data: submission, error: insertError } = await supabase
      .from('submissions')
      .insert({
        form_id: params.id,
        answers,
        metadata: {
          submitted_at: new Date().toISOString(),
          user_agent: request.headers.get('user-agent') || '',
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Submissions API] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: submission.id }, { status: 201 });
  } catch (error: any) {
    console.error('[Submissions API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServerClient(token);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    const { data: submissions, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('form_id', params.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[Submissions API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json(submissions || []);
  } catch (error: any) {
    console.error('[Submissions API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
