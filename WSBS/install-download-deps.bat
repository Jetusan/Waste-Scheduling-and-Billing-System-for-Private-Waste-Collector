@echo off
echo Installing download dependencies...
echo.

echo Installing expo-media-library...
npx expo install expo-media-library

echo Installing expo-file-system...
npx expo install expo-file-system

echo Installing expo-sharing...
npx expo install expo-sharing

echo Installing react-native-view-shot...
npm install react-native-view-shot

echo.
echo ✅ All dependencies installed!
echo.
echo Next steps:
echo 1. Run 'npx expo run:android' to rebuild the app
echo 2. Test the download functionality
echo.
pause
