@echo off
echo Cleaning up problematic dependencies...
echo.

echo Removing node_modules...
rmdir /s /q node_modules

echo Removing package-lock.json...
del package-lock.json

echo Reinstalling dependencies...
npm install

echo.
echo ✅ Dependencies cleaned up!
echo.
echo Next steps:
echo 1. Run 'npx expo start' to start the development server
echo 2. Test the receipt functionality
echo.
pause
