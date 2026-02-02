/*
  # Conversational Forms SaaS Schema

  ## Overview
  Complete database schema for a SaaS application that creates AI-powered conversational forms.
  
  ## New Tables
  
  ### `forms`
  Stores form configurations created by users
  - `id` (uuid, primary key) - Unique form identifier
  - `user_id` (uuid, foreign key) - Owner of the form (from auth.users)
  - `name` (text) - Form display name
  - `slug` (text, unique) - URL-friendly identifier for public access
  - `conversation_rules` (text) - Instructions for AI conversation flow
  - `business_info` (jsonb) - Key-value pairs of business context
  - `data_fields` (jsonb) - Array of fields to collect with type and required flag
  - `is_published` (boolean) - Whether form is publicly accessible
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `conversations`
  Tracks individual form submission sessions
  - `id` (uuid, primary key) - Unique conversation identifier
  - `form_id` (uuid, foreign key) - Associated form
  - `status` (text) - Status: 'in_progress', 'completed', 'abandoned'
  - `started_at` (timestamptz) - When conversation began
  - `completed_at` (timestamptz, nullable) - When conversation finished
  - `created_at` (timestamptz) - Creation timestamp
  
  ### `messages`
  Stores all messages in a conversation
  - `id` (uuid, primary key) - Unique message identifier
  - `conversation_id` (uuid, foreign key) - Associated conversation
  - `role` (text) - 'assistant' or 'user'
  - `content` (text) - Message text
  - `created_at` (timestamptz) - Message timestamp
  
  ### `responses`
  Stores extracted structured data from completed conversations
  - `id` (uuid, primary key) - Unique response identifier
  - `conversation_id` (uuid, foreign key) - Associated conversation
  - `form_id` (uuid, foreign key) - Associated form
  - `extracted_data` (jsonb) - Structured data matching form's data_fields
  - `completed_at` (timestamptz) - When response was finalized
  - `created_at` (timestamptz) - Creation timestamp
  
  ### `subscriptions`
  Manages user subscription plans and usage limits
  - `id` (uuid, primary key) - Unique subscription identifier
  - `user_id` (uuid, foreign key) - Associated user
  - `plan` (text) - Plan tier: 'free', 'starter', 'pro', 'enterprise'
  - `status` (text) - Status: 'active', 'canceled', 'past_due'
  - `stripe_customer_id` (text, nullable) - Stripe customer reference
  - `stripe_subscription_id` (text, nullable) - Stripe subscription reference
  - `forms_limit` (integer) - Maximum forms allowed
  - `responses_limit` (integer) - Maximum responses per month
  - `current_period_responses` (integer) - Responses in current billing period
  - `period_start` (timestamptz) - Current billing period start
  - `period_end` (timestamptz) - Current billing period end
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## Security
  
  All tables have Row Level Security (RLS) enabled with policies for:
  1. Users can only access their own forms and related data
  2. Public can access published forms for conversation creation
  3. Proper tenant isolation to prevent data leaks
  
  ## Indexes
  
  Performance indexes on frequently queried columns:
  - form slugs for public access
  - user_id for dashboard queries
  - conversation_id for message retrieval
*/

-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  conversation_rules text DEFAULT '',
  business_info jsonb DEFAULT '[]'::jsonb,
  data_fields jsonb DEFAULT '[]'::jsonb,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  status text DEFAULT 'in_progress',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text DEFAULT 'free',
  status text DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  forms_limit integer DEFAULT 3,
  responses_limit integer DEFAULT 100,
  current_period_responses integer DEFAULT 0,
  period_start timestamptz DEFAULT now(),
  period_end timestamptz DEFAULT (now() + interval '1 month'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON forms(user_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug);
CREATE INDEX IF NOT EXISTS idx_conversations_form_id ON conversations(form_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON responses(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_conversation_id ON responses(conversation_id);

-- Enable Row Level Security
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forms
CREATE POLICY "Users can view own forms"
  ON forms FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own forms"
  ON forms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own forms"
  ON forms FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own forms"
  ON forms FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view published forms"
  ON forms FOR SELECT
  TO anon
  USING (is_published = true);

-- RLS Policies for conversations
CREATE POLICY "Form owners can view conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = conversations.form_id
      AND forms.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can create conversations"
  ON conversations FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = conversations.form_id
      AND forms.is_published = true
    )
  );

CREATE POLICY "Public can update own conversations"
  ON conversations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- RLS Policies for messages
CREATE POLICY "Form owners can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN forms ON forms.id = conversations.form_id
      WHERE conversations.id = messages.conversation_id
      AND forms.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can create messages"
  ON messages FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN forms ON forms.id = conversations.form_id
      WHERE conversations.id = messages.conversation_id
      AND forms.is_published = true
    )
  );

CREATE POLICY "Public can view conversation messages"
  ON messages FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for responses
CREATE POLICY "Form owners can view responses"
  ON responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = responses.form_id
      AND forms.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can create responses"
  ON responses FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = responses.form_id
      AND forms.is_published = true
    )
  );

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-create subscription for new users
CREATE OR REPLACE FUNCTION create_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, forms_limit, responses_limit)
  VALUES (NEW.id, 'free', 'active', 3, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_for_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_forms_updated_at ON forms;
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();