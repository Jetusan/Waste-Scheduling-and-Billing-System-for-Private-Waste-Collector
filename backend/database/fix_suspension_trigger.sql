-- Fix the check_suspension_criteria trigger function
-- The issue: Using COUNT(*) with ORDER BY causes GROUP BY error

DROP FUNCTION IF EXISTS check_suspension_criteria() CASCADE;

CREATE OR REPLACE FUNCTION check_suspension_criteria()
RETURNS TRIGGER AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  -- Count failed attempts in last 10 days (fixed query)
  SELECT COUNT(*)
  INTO failed_count
  FROM (
    SELECT attempt_id
    FROM payment_attempts
    WHERE subscription_id = NEW.subscription_id
      AND outcome IN ('not_home', 'refused', 'no_cash', 'promised_next_time')
      AND attempt_date >= CURRENT_DATE - INTERVAL '10 days'
    ORDER BY attempt_date DESC
    LIMIT 3
  ) AS recent_attempts;
  
  -- Suspend if 3 or more failed attempts
  IF failed_count >= 3 THEN
    UPDATE customer_subscriptions
    SET 
      status = 'suspended',
      suspension_reason = 'Three consecutive failed payment attempts',
      suspended_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE subscription_id = NEW.subscription_id
      AND status != 'suspended'; -- Don't re-suspend
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_check_suspension ON payment_attempts;
CREATE TRIGGER trigger_check_suspension
  AFTER INSERT ON payment_attempts
  FOR EACH ROW
  WHEN (NEW.outcome IN ('not_home', 'refused', 'no_cash', 'promised_next_time'))
  EXECUTE FUNCTION check_suspension_criteria();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Suspension trigger fixed successfully!';
  RAISE NOTICE '🔧 Function: check_suspension_criteria() updated';
  RAISE NOTICE '⚡ Trigger: trigger_check_suspension recreated';
END $$;
