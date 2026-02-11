import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/types';

export async function POST(
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

    const { data: form, error: fetchError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !form) {
      console.error('[Publish API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: fetchError?.message || 'Form not found' },
        { status: 404 }
      );
    }

    const newVersion = (form.version || 0) + 1;
    const now = new Date().toISOString();

    const updates: Record<string, any> = {
      published_config: form.current_config,
      is_published: true,
      updated_at: now,
    };

    if ('status' in form) {
      updates.status = 'live';
    }
    if ('version' in form) {
      updates.version = newVersion;
    }
    if ('published_at' in form) {
      updates.published_at = now;
    }

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
        { error: updateError.message || 'Failed to publish form' },
        { status: 500 }
      );
    }

    try {
      const { error: versionError } = await supabase
        .from('form_versions')
        .insert({
          form_id: params.id,
          version_number: newVersion,
          config_snapshot: form.current_config,
        });

      if (versionError) {
        console.error('[Publish API] Version insert error (non-fatal):', versionError.message);
      }
    } catch (versionErr) {
      console.error('[Publish API] Version insert exception (non-fatal):', versionErr);
    }

    return NextResponse.json(updatedForm);
  } catch (error: any) {
    console.error('[Publish API] Unexpected error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
