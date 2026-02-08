import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/types';

export async function POST(
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

    const newVersion = (form.version || 0) + 1;
    const now = new Date().toISOString();

    const updates: Record<string, any> = {
      published_config: form.current_config,
      status: 'live',
      is_published: true,
      version: newVersion,
      published_at: now,
      updated_at: now,
    };

    if (!form.slug) {
      updates.slug = generateSlug(form.name || 'form');
    }

    const { data: updatedForm, error: updateError } = await supabase
      .from('forms')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Publish API] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to publish form' },
        { status: 500 }
      );
    }

    const { error: versionError } = await supabase
      .from('form_versions')
      .insert({
        form_id: params.id,
        version_number: newVersion,
        config_snapshot: form.current_config,
      });

    if (versionError) {
      console.error('[Publish API] Version insert error:', versionError);
    }

    return NextResponse.json(updatedForm);
  } catch (error: any) {
    console.error('[Publish API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
