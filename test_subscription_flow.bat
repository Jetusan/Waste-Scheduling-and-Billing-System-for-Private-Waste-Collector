@echo off
echo 🚀 Starting Subscription Flow Test...
echo.

cd backend
node scripts/test_complete_subscription_flow.js

echo.
echo ✅ Test completed. Press any key to exit...
pause > nul
