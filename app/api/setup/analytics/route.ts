import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function executeSQL(sql: string): Promise<{ error?: string }> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_text: sql }),
  });

  if (resp.ok) return {};
  const text = await resp.text();
  return { error: text };
}

export async function POST() {
  if (!SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: testError } = await supabase.from('form_events').select('id').limit(1);

    if (!testError) {
      return NextResponse.json({ status: 'already_exists', message: 'form_events table already exists' });
    }

    return NextResponse.json({
      status: 'needs_creation',
      message: 'The form_events table does not exist yet. Please run the following SQL in your Supabase Dashboard → SQL Editor:',
      sql: `
CREATE TABLE IF NOT EXISTS form_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  session_id text NOT NULL,
  step_id text,
  step_type text,
  step_index integer,
  device_type text DEFAULT 'desktop',
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_events_form_id ON form_events(form_id);
CREATE INDEX IF NOT EXISTS idx_form_events_event_type ON form_events(event_type);
CREATE INDEX IF NOT EXISTS idx_form_events_session_id ON form_events(session_id);
CREATE INDEX IF NOT EXISTS idx_form_events_created_at ON form_events(created_at);

ALTER TABLE form_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert" ON form_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow authenticated insert" ON form_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow owner select" ON form_events
  FOR SELECT TO authenticated
  USING (form_id IN (SELECT id FROM forms WHERE user_id = auth.uid()));

CREATE POLICY "Allow service role all" ON form_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
      `.trim(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
