import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServerClient(token);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const { data: events, error: eventsError } = await supabase
      .from('form_events')
      .select('*')
      .eq('form_id', params.id)
      .order('created_at', { ascending: true });

    if (eventsError) {
      if (eventsError.code === 'PGRST205' || eventsError.message?.includes('form_events')) {
        return NextResponse.json({
          views: { total: 0, unique: 0 },
          starts: 0,
          completions: 0,
          completionRate: 0,
          submissions: 0,
          avgTimeToComplete: null,
          dropOff: [],
          devices: { desktop: 0, mobile: 0, tablet: 0 },
          empty: true,
          tableNotReady: true,
        });
      }
      console.error('[Analytics API] Fetch error:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    const rows = events || [];

    const sessions = new Map<string, typeof rows>();
    for (const ev of rows) {
      if (!sessions.has(ev.session_id)) sessions.set(ev.session_id, []);
      sessions.get(ev.session_id)!.push(ev);
    }

    const viewEvents = rows.filter(e => e.event_type === 'form_view');
    const totalViews = viewEvents.length;
    const uniqueViews = new Set(viewEvents.map(e => e.session_id)).size;

    const starts = new Set(
      rows.filter(e => e.event_type === 'form_start').map(e => e.session_id)
    ).size;

    const completeSessions = new Set(
      rows.filter(e => e.event_type === 'form_complete').map(e => e.session_id)
    );
    const completions = completeSessions.size;

    const submitSessions = new Set(
      rows.filter(e => e.event_type === 'form_submit').map(e => e.session_id)
    );
    const submissions = submitSessions.size;

    const completionRate = starts > 0 ? Math.round((completions / starts) * 100) : 0;

    const completionTimes: number[] = [];
    sessions.forEach((sevents, sid) => {
      if (!completeSessions.has(sid)) return;
      const completeEvent = sevents.find(e => e.event_type === 'form_complete');
      if (completeEvent?.duration_ms && completeEvent.duration_ms > 0) {
        completionTimes.push(completeEvent.duration_ms);
      }
    });
    const avgTimeToComplete = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : null;

    const stepReachedMap = new Map<string, { step_id: string; step_type: string; step_index: number; count: number }>();
    const stepReachedEvents = rows.filter(e => e.event_type === 'step_reached');
    for (const ev of stepReachedEvents) {
      const key = ev.step_id || `step_${ev.step_index}`;
      if (!stepReachedMap.has(key)) {
        stepReachedMap.set(key, {
          step_id: ev.step_id || '',
          step_type: ev.step_type || '',
          step_index: ev.step_index ?? 0,
          count: 0,
        });
      }
      stepReachedMap.get(key)!.count++;
    }

    const dropOff = Array.from(stepReachedMap.values())
      .sort((a, b) => a.step_index - b.step_index);

    const devices = { desktop: 0, mobile: 0, tablet: 0 };
    const sessionDevices = new Map<string, string>();
    for (const ev of rows) {
      if (!sessionDevices.has(ev.session_id)) {
        sessionDevices.set(ev.session_id, ev.device_type || 'desktop');
      }
    }
    for (const dt of sessionDevices.values()) {
      if (dt === 'mobile') devices.mobile++;
      else if (dt === 'tablet') devices.tablet++;
      else devices.desktop++;
    }

    return NextResponse.json({
      views: { total: totalViews, unique: uniqueViews },
      starts,
      completions,
      completionRate,
      submissions,
      avgTimeToComplete,
      dropOff,
      devices,
      empty: rows.length === 0,
    });
  } catch (err: any) {
    console.error('[Analytics API] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
