@echo off
echo 🧹 Cleaning up test subscription data...
echo.

cd backend
node scripts/cleanup_test_data.js %1

echo.
echo ✅ Cleanup completed. Press any key to exit...
pause > nul
