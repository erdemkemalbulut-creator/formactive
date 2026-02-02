/*
  # Add Last Activity Tracking for Conversations

  1. Changes
    - Add `last_activity_at` column to conversations table
    - Defaults to `started_at` for existing conversations
    - Updated on each user message to track engagement
    - Used to determine abandoned conversations (24 hours with no user activity)

  2. Purpose
    - Track when the last user message was sent
    - Enable accurate abandoned conversation detection
    - Distinguish between active and stale conversations

  3. Notes
    - Only user messages update this timestamp (not assistant messages)
    - Completed conversations are never marked as abandoned
    - 24-hour threshold starts from last user interaction, not conversation start
*/

-- Add last_activity_at column to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE conversations 
    ADD COLUMN last_activity_at timestamptz DEFAULT now();
    
    -- Set existing conversations' last_activity_at to started_at
    UPDATE conversations 
    SET last_activity_at = started_at
    WHERE last_activity_at IS NULL;
    
    -- Make it NOT NULL after setting defaults
    ALTER TABLE conversations 
    ALTER COLUMN last_activity_at SET NOT NULL;
    
    -- Add index for efficient abandoned conversation queries
    CREATE INDEX IF NOT EXISTS idx_conversations_last_activity 
    ON conversations(status, last_activity_at);
  END IF;
END $$;

-- Drop old abandoned detection function
DROP FUNCTION IF EXISTS mark_abandoned_conversations();

-- Create improved abandoned conversation detection function
CREATE OR REPLACE FUNCTION mark_abandoned_conversations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  abandoned_count INTEGER;
BEGIN
  -- Mark conversations as abandoned if:
  -- 1. Status is 'in_progress' (never mark completed as abandoned)
  -- 2. Last user activity was 24+ hours ago
  WITH abandoned_convs AS (
    UPDATE conversations
    SET status = 'abandoned'
    WHERE status = 'in_progress'
      AND last_activity_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO abandoned_count FROM abandoned_convs;

  -- Log the result
  RAISE NOTICE 'Marked % conversations as abandoned', abandoned_count;

  RETURN abandoned_count;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION mark_abandoned_conversations() IS 
'Marks in_progress conversations with no user activity for 24+ hours as abandoned. Never marks completed conversations. Returns count of updated conversations.';
