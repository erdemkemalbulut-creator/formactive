'use client';

import { useState } from 'react';

const MIGRATION_SQL = `-- Form Builder V2 Schema Migration
-- Run this in your Supabase SQL Editor

ALTER TABLE forms ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS published_config jsonb DEFAULT NULL;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS current_config jsonb DEFAULT '{}';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT NULL;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS version integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS form_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  config_snapshot jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_versions_form_id ON form_versions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);

ALTER TABLE form_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'form_versions' AND policyname = 'Users can view versions of own forms') THEN
    CREATE POLICY "Users can view versions of own forms"
      ON form_versions FOR SELECT TO authenticated
      USING (form_id IN (SELECT id FROM forms WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'form_versions' AND policyname = 'Users can insert versions for own forms') THEN
    CREATE POLICY "Users can insert versions for own forms"
      ON form_versions FOR INSERT TO authenticated
      WITH CHECK (form_id IN (SELECT id FROM forms WHERE user_id = auth.uid()));
  END IF;
END $$;

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'Users can view submissions for own forms') THEN
    CREATE POLICY "Users can view submissions for own forms"
      ON submissions FOR SELECT TO authenticated
      USING (form_id IN (SELECT id FROM forms WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'Anyone can submit to published forms') THEN
    CREATE POLICY "Anyone can submit to published forms"
      ON submissions FOR INSERT TO anon, authenticated
      WITH CHECK (form_id IN (SELECT id FROM forms WHERE status = 'live'));
  END IF;
END $$;`;

export default function SetupPage() {
  const [copied, setCopied] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MIGRATION_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = MIGRATION_SQL;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Setup</h1>
        <p className="text-gray-600 mb-8">
          Your database needs a one-time update to support the form builder. Follow these 3 steps:
        </p>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</span>
              <h2 className="text-lg font-semibold">Copy the SQL</h2>
            </div>
            <p className="text-gray-600 mb-4 ml-11">Click the button below to copy the migration SQL to your clipboard.</p>
            <div className="ml-11">
              <button
                onClick={handleCopy}
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? 'Copied!' : 'Copy SQL to Clipboard'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</span>
              <h2 className="text-lg font-semibold">Open Supabase SQL Editor</h2>
            </div>
            <p className="text-gray-600 mb-4 ml-11">Click the link below to open your Supabase project's SQL Editor.</p>
            <div className="ml-11">
              <a
                href={sqlEditorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Open SQL Editor
              </a>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</span>
              <h2 className="text-lg font-semibold">Paste and Run</h2>
            </div>
            <div className="text-gray-600 ml-11 space-y-2">
              <p>In the SQL Editor:</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Paste the copied SQL into the editor area</li>
                <li>Click the <strong>"Run"</strong> button (or press Ctrl+Enter)</li>
                <li>You should see "Success. No rows returned" - that means it worked!</li>
              </ol>
              <p className="mt-4">
                After running, come back here and{' '}
                <a href="/dashboard" className="text-blue-600 hover:underline font-medium">
                  go to your Dashboard
                </a>{' '}
                - the "New form" button will now work.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">
            <strong>Note:</strong> This is a safe, one-time operation. The SQL uses "IF NOT EXISTS" checks so it won't break anything if you run it multiple times.
          </p>
        </div>

        <details className="mt-6">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            View the SQL that will be run
          </summary>
          <pre className="mt-2 bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
            {MIGRATION_SQL}
          </pre>
        </details>
      </div>
    </div>
  );
}
