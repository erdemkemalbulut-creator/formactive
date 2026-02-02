/*
  # Optimize RLS Policies and Functions for Performance and Security

  ## Overview
  This migration addresses performance and security issues identified by Supabase Analysis.

  ## Changes

  ### 1. RLS Policy Optimization
  All RLS policies that use `auth.uid()` are updated to use `(select auth.uid())` instead.
  This prevents the function from being re-evaluated for each row, significantly improving 
  query performance at scale.
  
  Policies updated:
  - forms: view, create, update, delete own forms
  - conversations: form owners can view conversations
  - messages: form owners can view messages
  - responses: form owners can view responses
  - subscriptions: users can view and update own subscription

  ### 2. Function Security Hardening
  All functions now use immutable search_path to prevent search path hijacking attacks.
  Functions updated:
  - create_subscription_for_new_user()
  - update_updated_at_column()
  - mark_abandoned_conversations()

  ## Security Impact
  - Improved query performance (policies evaluate once per query instead of per row)
  - Prevents search path manipulation attacks on security definer functions
  - Maintains existing access control - no functional changes to permissions

  ## Notes
  - Password leak protection must be enabled via Supabase Dashboard > Authentication > Settings
  - Unused index warnings are expected for new databases and will be utilized as data grows
  - Multiple permissive policies on messages table are intentional for different access patterns
*/

-- ============================================================================
-- PART 1: Optimize RLS Policies
-- ============================================================================

-- Drop and recreate forms policies with optimized auth checks
DROP POLICY IF EXISTS "Users can view own forms" ON forms;
CREATE POLICY "Users can view own forms"
  ON forms FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own forms" ON forms;
CREATE POLICY "Users can create own forms"
  ON forms FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own forms" ON forms;
CREATE POLICY "Users can update own forms"
  ON forms FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own forms" ON forms;
CREATE POLICY "Users can delete own forms"
  ON forms FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate conversations policies with optimized auth checks
DROP POLICY IF EXISTS "Form owners can view conversations" ON conversations;
CREATE POLICY "Form owners can view conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = conversations.form_id
      AND forms.user_id = (select auth.uid())
    )
  );

-- Drop and recreate messages policies with optimized auth checks
DROP POLICY IF EXISTS "Form owners can view messages" ON messages;
CREATE POLICY "Form owners can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      JOIN forms ON forms.id = conversations.form_id
      WHERE conversations.id = messages.conversation_id
      AND forms.user_id = (select auth.uid())
    )
  );

-- Drop and recreate responses policies with optimized auth checks
DROP POLICY IF EXISTS "Form owners can view responses" ON responses;
CREATE POLICY "Form owners can view responses"
  ON responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = responses.form_id
      AND forms.user_id = (select auth.uid())
    )
  );

-- Drop and recreate subscriptions policies with optimized auth checks
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- PART 2: Secure Functions with Immutable Search Path
-- ============================================================================

-- Recreate create_subscription_for_new_user with secure search_path
CREATE OR REPLACE FUNCTION create_subscription_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, forms_limit, responses_limit)
  VALUES (NEW.id, 'free', 'active', 2, 50);
  RETURN NEW;
END;
$$;

-- Recreate update_updated_at_column with secure search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate mark_abandoned_conversations with secure search_path
CREATE OR REPLACE FUNCTION mark_abandoned_conversations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  abandoned_count INTEGER;
BEGIN
  -- Update conversations that have been inactive for 24+ hours
  WITH abandoned_convs AS (
    UPDATE public.conversations c
    SET status = 'abandoned'
    WHERE c.status = 'in_progress'
      AND (
        -- Case 1: Has messages, but last message is old
        EXISTS (
          SELECT 1
          FROM public.messages m
          WHERE m.conversation_id = c.id
          AND m.created_at < NOW() - INTERVAL '24 hours'
          AND NOT EXISTS (
            SELECT 1
            FROM public.messages m2
            WHERE m2.conversation_id = c.id
            AND m2.created_at >= NOW() - INTERVAL '24 hours'
          )
        )
        -- Case 2: No messages and conversation started 24+ hours ago
        OR (
          NOT EXISTS (
            SELECT 1
            FROM public.messages m
            WHERE m.conversation_id = c.id
          )
          AND c.started_at < NOW() - INTERVAL '24 hours'
        )
      )
    RETURNING c.id
  )
  SELECT COUNT(*) INTO abandoned_count FROM abandoned_convs;

  RETURN abandoned_count;
END;
$$;

-- Add comments to document the security improvements
COMMENT ON FUNCTION create_subscription_for_new_user() IS 
'Creates a free subscription for new users. Secured with immutable search_path.';

COMMENT ON FUNCTION update_updated_at_column() IS 
'Updates the updated_at timestamp. Secured with immutable search_path.';

COMMENT ON FUNCTION mark_abandoned_conversations() IS 
'Marks conversations inactive for 24+ hours as abandoned. Secured with immutable search_path.';
