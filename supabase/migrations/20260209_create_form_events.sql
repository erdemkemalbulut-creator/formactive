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
