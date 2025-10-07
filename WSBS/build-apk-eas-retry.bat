@echo off
title EAS Build APK - Clean Retry
echo 🚀 EAS Build APK - Clean Retry
echo ==============================

echo.
echo 🧹 Cleaning up any stuck builds...
call npx eas build:cancel --all --non-interactive

echo.
echo 📱 Starting fresh APK build...
echo - Profile: preview (APK format)
echo - Platform: Android
echo - Backend: Production

echo.
echo ⚡ Building APK (this may take 15-45 minutes)...
call npx eas build -p android --profile preview --non-interactive --clear-cache

echo.
echo ✅ Build submitted!
echo 📋 Check status at: https://expo.dev/accounts/jetusan/projects/wsbs-waste-management/builds

pause
