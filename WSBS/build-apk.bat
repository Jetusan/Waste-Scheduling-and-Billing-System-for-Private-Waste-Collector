@echo off
echo Building WSBS APK...
echo.

echo Step 1: Setting up environment...
set NODE_ENV=production

echo Step 2: Installing dependencies...
call npm install

echo Step 3: Building Android APK...
cd android
call gradlew assembleRelease
cd ..

echo.
echo APK Location: android\app\build\outputs\apk\release\app-release.apk
echo.
pause
