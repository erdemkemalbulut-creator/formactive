/*
  # Fix Subscription Trigger Schema Reference
  
  ## Problem
  The trigger `on_auth_user_created` was calling `create_subscription_for_new_user()` 
  without specifying the schema. Since the trigger is on `auth.users` but the function 
  is in `public` schema, PostgreSQL may fail to find the function.
  
  ## Solution
  Recreate the trigger with explicit schema reference: `public.create_subscription_for_new_user()`
  
  ## Changes
  - Drop and recreate trigger with proper schema qualification
*/

-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate with explicit schema reference
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_subscription_for_new_user();
