/*
  # Form Builder V2 Schema
  
  Adds support for the single-page form builder with:
  - published_config column for publish/republish workflow
  - form_versions table for version history
  - submissions table for classic form submissions
  - Status tracking (draft/live)
  
  Preserves existing columns for backward compatibility.
*/

-- Add new columns to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'live'));
ALTER TABLE forms ADD COLUMN IF NOT EXISTS published_config jsonb DEFAULT NULL;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS current_config jsonb DEFAULT '{}'::jsonb;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT NULL;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS version integer DEFAULT 0;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS welcome_title text DEFAULT '';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS welcome_message text DEFAULT '';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS welcome_cta text DEFAULT 'Start';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS welcome_enabled boolean DEFAULT true;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS end_message text DEFAULT 'Thank you for your submission!';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS end_redirect_url text DEFAULT '';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS end_redirect_enabled boolean DEFAULT false;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT '{}'::jsonb;

-- Create form_versions table
CREATE TABLE IF NOT EXISTS form_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  config_snapshot jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_form_versions_form_id ON form_versions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);

-- RLS for form_versions
ALTER TABLE form_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of own forms"
  ON form_versions FOR SELECT
  TO authenticated
  USING (form_id IN (SELECT id FROM forms WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert versions for own forms"
  ON form_versions FOR INSERT
  TO authenticated
  WITH CHECK (form_id IN (SELECT id FROM forms WHERE user_id = auth.uid()));

-- RLS for submissions
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view submissions for own forms"
  ON submissions FOR SELECT
  TO authenticated
  USING (form_id IN (SELECT id FROM forms WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can submit to published forms"
  ON submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (form_id IN (SELECT id FROM forms WHERE status = 'live'));

CREATE POLICY "Service role full access to submissions"
  ON submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to form_versions"
  ON form_versions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
