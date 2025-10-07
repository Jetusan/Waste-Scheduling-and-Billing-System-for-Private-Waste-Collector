@echo off
title Build WSBS APK with Android Studio
echo 🤖 Build WSBS APK with Android Studio
echo ====================================

echo.
echo 📋 Step 1: Generate Android Project
echo -----------------------------------
echo Generating native Android project from Expo...
call npx expo prebuild --platform android --clear

if errorlevel 1 (
    echo ❌ Failed to generate Android project
    pause
    exit /b 1
)

echo.
echo ✅ Android project generated successfully!
echo.
echo 📋 Step 2: Next Steps
echo ---------------------
echo 1. Download Android Studio: https://developer.android.com/studio
echo 2. Open Android Studio
echo 3. File → Open → Select: %CD%\android
echo 4. Wait for project to load (5-10 minutes first time)
echo 5. Build → Build Bundle(s)/APK(s) → Build APK(s)
echo 6. APK will be at: android\app\build\outputs\apk\release\app-release.apk

echo.
echo 🎯 Your APK will have PRODUCTION configuration:
echo - Backend: https://waste-scheduling-and-billing-system-for.onrender.com
echo - Deep Linking: wsbs://
echo - GCash Integration: Ready for live payments

echo.
echo 📁 Opening android folder...
start explorer "%CD%\android"

echo.
echo 🚀 Ready for Android Studio!
pause
