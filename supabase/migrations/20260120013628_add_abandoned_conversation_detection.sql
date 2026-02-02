/*
  # Add Abandoned Conversation Detection

  1. New Function
    - `mark_abandoned_conversations()` - Marks stale conversations as abandoned
    - Checks for conversations in 'in_progress' status with no activity for 24+ hours
    - Updates status to 'abandoned' based on last message timestamp

  2. Changes
    - Creates a PostgreSQL function that can be called manually or via cron
    - Identifies conversations where the most recent message is older than 24 hours
    - Only affects conversations still marked as 'in_progress'
    - Does not modify completed or already abandoned conversations

  3. Usage
    - Can be called manually: `SELECT mark_abandoned_conversations();`
    - Can be scheduled via pg_cron or external scheduler
    - Returns count of conversations marked as abandoned

  4. Notes
    - 24 hour threshold is a reasonable default for form abandonment
    - Conversations with no messages are also marked as abandoned after 24 hours from started_at
    - Only updates conversations, does not delete data
*/

-- Create function to mark abandoned conversations
CREATE OR REPLACE FUNCTION mark_abandoned_conversations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  abandoned_count INTEGER;
BEGIN
  -- Update conversations that have been inactive for 24+ hours
  WITH abandoned_convs AS (
    UPDATE conversations c
    SET status = 'abandoned'
    WHERE c.status = 'in_progress'
      AND (
        -- Case 1: Has messages, but last message is old
        EXISTS (
          SELECT 1
          FROM messages m
          WHERE m.conversation_id = c.id
          AND m.created_at < NOW() - INTERVAL '24 hours'
          AND NOT EXISTS (
            SELECT 1
            FROM messages m2
            WHERE m2.conversation_id = c.id
            AND m2.created_at >= NOW() - INTERVAL '24 hours'
          )
        )
        -- Case 2: No messages and conversation started 24+ hours ago
        OR (
          NOT EXISTS (
            SELECT 1
            FROM messages m
            WHERE m.conversation_id = c.id
          )
          AND c.started_at < NOW() - INTERVAL '24 hours'
        )
      )
    RETURNING c.id
  )
  SELECT COUNT(*) INTO abandoned_count FROM abandoned_convs;

  -- Log the result
  RAISE NOTICE 'Marked % conversations as abandoned', abandoned_count;

  RETURN abandoned_count;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION mark_abandoned_conversations() IS 
'Marks conversations that have been inactive for 24+ hours as abandoned. Returns count of updated conversations.';
