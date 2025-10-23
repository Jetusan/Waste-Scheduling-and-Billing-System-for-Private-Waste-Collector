-- Clear Duplicate Image Records for Testing
-- Run this script whenever you want to retest with the same image

-- Option 1: Clear all manual payment verifications for your user (user_id = 143)
DELETE FROM manual_payment_verifications 
WHERE user_id = 143;

-- Option 2: Clear only rejected/pending submissions for your user
-- DELETE FROM manual_payment_verifications 
-- WHERE user_id = 143 AND verification_status IN ('rejected', 'pending', 'auto_rejected');

-- Option 3: Clear specific verification by ID (if you know the ID)
-- DELETE FROM manual_payment_verifications 
-- WHERE verification_id = 3;

-- Option 4: Clear all records from last 24 hours (for testing)
-- DELETE FROM manual_payment_verifications 
-- WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check remaining records after deletion
SELECT * FROM manual_payment_verifications WHERE user_id = 143;

-- Reset auto-increment if needed (optional)
-- SELECT setval('manual_payment_verifications_verification_id_seq', 
--               COALESCE((SELECT MAX(verification_id) FROM manual_payment_verifications), 1));

COMMIT;
