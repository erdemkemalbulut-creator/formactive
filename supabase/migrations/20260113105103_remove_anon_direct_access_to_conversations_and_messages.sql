/*
  # Remove Anonymous Direct Access to Conversations and Messages

  ## Changes
  
  Remove RLS policies that allow anonymous users to directly access conversations and messages tables.
  All conversation and message operations must now go through the server API endpoints.

  ## Policies Removed
  
  ### Conversations table:
  - "Public can create conversations" (INSERT for anon)
  - "Public can update own conversations" (UPDATE for anon)

  ### Messages table:
  - "Public can create messages" (INSERT for anon)
  - "Public can view conversation messages" (SELECT for anon)

  ## Security
  
  This change ensures that:
  1. Anonymous users cannot directly manipulate conversation or message data
  2. All operations are validated and logged server-side
  3. RLS policies remain strict while maintaining functionality through API endpoints
  4. Form owners retain full access to view their form conversations and messages
*/

-- Drop anon policies for conversations
DROP POLICY IF EXISTS "Public can create conversations" ON conversations;
DROP POLICY IF EXISTS "Public can update own conversations" ON conversations;

-- Drop anon policies for messages
DROP POLICY IF EXISTS "Public can create messages" ON messages;
DROP POLICY IF EXISTS "Public can view conversation messages" ON messages;
