@echo off
title WSBS Quick APK Build
echo 🚀 WSBS Quick APK Build
echo ======================

echo.
echo 📱 Building production APK...
echo - Backend: https://waste-scheduling-and-billing-system-for.onrender.com
echo - Profile: Preview (APK format)
echo - Environment: Production

echo.
echo 🔄 Starting EAS Build...
call npx eas build -p android --profile preview --non-interactive

echo.
echo ✅ Build submitted to EAS!
echo 📋 Check build status at: https://expo.dev/accounts/jetusan/projects/wsbs-waste-management/builds

pause
