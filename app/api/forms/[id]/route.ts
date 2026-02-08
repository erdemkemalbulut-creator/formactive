import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

async function authenticateUser(supabase: any, request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: 'Unauthorized' };
  }

  return { user, error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 500 }
      );
    }

    const { user, error: authError } = await authenticateUser(supabase, request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { data: form, error: fetchError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(form);
  } catch (error: any) {
    console.error('[Forms API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 500 }
      );
    }

    const { user, error: authError } = await authenticateUser(supabase, request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('forms')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    const allowedFields = ['name', 'current_config', 'status', 'slug'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: form, error: updateError } = await supabase
      .from('forms')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Forms API] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update form' },
        { status: 500 }
      );
    }

    return NextResponse.json(form);
  } catch (error: any) {
    console.error('[Forms API] PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
