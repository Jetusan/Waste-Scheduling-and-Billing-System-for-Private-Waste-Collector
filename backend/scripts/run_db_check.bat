@echo off
echo 🔍 Checking Neon Database Schema...
echo.
cd /d "%~dp0.."
node scripts/check_billing_tables.js
echo.
pause
