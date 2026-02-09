import { NextRequest, NextResponse } from 'next/server';
import { getAnonClient } from '@/lib/supabase';

const VALID_EVENTS = new Set([
  'form_view',
  'form_start',
  'step_reached',
  'form_complete',
  'form_submit',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const { event_type, session_id, step_id, step_type, step_index, device_type, duration_ms } = body;

    if (!event_type || !VALID_EVENTS.has(event_type)) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
    }

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const supabase = getAnonClient();

    const { error } = await supabase.from('form_events').insert({
      form_id: params.id,
      event_type,
      session_id,
      step_id: step_id || null,
      step_type: step_type || null,
      step_index: typeof step_index === 'number' ? step_index : null,
      device_type: device_type || 'desktop',
      duration_ms: typeof duration_ms === 'number' ? duration_ms : null,
    });

    if (error) {
      console.error('[Events API] Insert error:', error);
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    console.error('[Events API] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
