@echo off
title WSBS Production APK Build
echo 🚀 WSBS Production APK Build
echo ===========================

echo.
echo 📱 Building production APK for WSBS...
echo This will create an APK that connects to production backend.

echo.
echo 🔧 Configuration:
echo - Backend URL: https://waste-scheduling-and-billing-system-for.onrender.com
echo - Environment: Production
echo - Deep Linking: wsbs://

echo.
echo 📦 Installing dependencies...
call npm install

echo.
echo 🔨 Building APK with EAS Build...
echo This may take 10-15 minutes...
call npx eas build -p android --profile preview

echo.
echo ✅ APK Build Complete!
echo ======================

echo.
echo 📱 Your production APK is ready for distribution!
echo 🔗 Download link will be provided by EAS Build
echo 📋 The APK is configured to use production backend
echo 🎯 Users can install and use the app immediately

pause
