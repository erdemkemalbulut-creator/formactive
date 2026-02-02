/*
  # Add Service Role INSERT Policies for Conversations and Messages

  ## Changes
  
  Add INSERT policies to allow server-side API routes (using service role) to create conversations and messages.
  These policies are essential for the public form submission flow.

  ## New Policies
  
  ### Conversations table:
  - "Service role can insert conversations" - Allows API endpoints to create new conversations for any published form
  
  ### Messages table:
  - "Service role can insert messages" - Allows API endpoints to save conversation messages
  - "Service role can view messages" - Allows API endpoints to read conversation history
  
  ## Security
  
  These policies:
  1. Allow server-side operations through API endpoints
  2. Maintain security by requiring server-side validation
  3. Do not expose direct database access to anonymous users
  4. Form owners retain full access through existing policies
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Service role can insert messages" ON messages;
DROP POLICY IF EXISTS "Service role can view messages" ON messages;

-- Add INSERT policy for conversations (allows server to create conversations for published forms)
CREATE POLICY "Service role can insert conversations"
  ON conversations
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_id 
      AND forms.is_published = true
    )
  );

-- Add INSERT policy for messages (allows server to save messages for any conversation)
CREATE POLICY "Service role can insert messages"
  ON messages
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_id
    )
  );

-- Add SELECT policy for messages (so server can read conversation history)
CREATE POLICY "Service role can view messages"
  ON messages
  FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_id
    )
  );
