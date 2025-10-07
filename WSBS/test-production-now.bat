@echo off
title Test WSBS Production App
echo 🚀 Test WSBS Production App
echo ===========================

echo.
echo 📱 Your app is configured for PRODUCTION:
echo - Backend: https://waste-scheduling-and-billing-system-for.onrender.com
echo - Deep Linking: wsbs://
echo - GCash Integration: Ready
echo - Email Verification: Production URLs

echo.
echo 🔧 Starting Expo development server...
echo 📲 Download "Expo Go" app on your phone
echo 📷 Scan the QR code to test your production app

echo.
call npx expo start --clear

pause
