/*
  # Improve Subscription Trigger Error Handling
  
  ## Changes
  - Add better error handling to the subscription creation function
  - Ensure the function doesn't fail silently
  - Log errors for debugging
  
  ## Notes
  The function uses SECURITY DEFINER to have sufficient privileges to insert into subscriptions table
*/

-- Recreate function with better error handling
CREATE OR REPLACE FUNCTION public.create_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert subscription for new user
  INSERT INTO public.subscriptions (user_id, plan, status, forms_limit, responses_limit)
  VALUES (NEW.id, 'free', 'active', 3, 100);
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If subscription already exists, just return NEW
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE WARNING 'Failed to create subscription for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
