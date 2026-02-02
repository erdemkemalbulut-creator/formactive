/*
  # Add Field Extraction Tracking

  ## Overview
  Adds tracking for field extraction attempts and confirmation status to enable
  intelligent retry logic for required fields.

  ## Changes

  1. **Conversations Table**
    - Add `field_retry_counts` (jsonb) - Tracks retry attempts per field
      Format: {"fieldName": attemptCount}

  2. **Responses Table**
    - Add `field_metadata` (jsonb) - Tracks confirmation status per field
      Format: {"fieldName": {"confirmed": true/false, "attempts": number}}

  ## Purpose
  - Enable retry logic (max 2 attempts per field)
  - Track which fields are "unconfirmed" after max retries
  - Display "Needs review" badges in admin UI
  - Don't block user completion for unconfirmed fields
*/

-- Add field_retry_counts to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'field_retry_counts'
  ) THEN
    ALTER TABLE conversations ADD COLUMN field_retry_counts jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add field_metadata to responses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'responses' AND column_name = 'field_metadata'
  ) THEN
    ALTER TABLE responses ADD COLUMN field_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index for field_metadata queries
CREATE INDEX IF NOT EXISTS idx_responses_field_metadata ON responses USING gin(field_metadata);
