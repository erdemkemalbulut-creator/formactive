import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { createDefaultConfig, generateSlug } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Form name is required' },
        { status: 400 }
      );
    }

    const slug = generateSlug(name.trim());
    const defaultConfig = createDefaultConfig();

    const { data: form, error: insertError } = await supabase
      .from('forms')
      .insert({
        user_id: user.id,
        name: name.trim(),
        slug,
        status: 'draft',
        current_config: defaultConfig,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Forms API] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create form' },
        { status: 500 }
      );
    }

    return NextResponse.json(form, { status: 201 });
  } catch (error: any) {
    console.error('[Forms API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
