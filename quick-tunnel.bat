@echo off
echo 🌐 WSBS Quick Tunnel Start
echo ==========================

:: Check if cloudflared exists in current directory
if exist "cloudflared.exe" (
    echo ✅ Found cloudflared.exe in current directory
    goto :start_tunnel
)

:: Check if cloudflared exists in tools directory
if exist "C:\wsbs-tools\cloudflared.exe" (
    echo ✅ Found cloudflared.exe in C:\wsbs-tools\
    set CLOUDFLARED_PATH=C:\wsbs-tools\cloudflared.exe
    goto :start_tunnel
)

echo ❌ Cloudflared not found. Please download it first:
echo 1. Go to: https://github.com/cloudflare/cloudflared/releases/latest
echo 2. Download: cloudflared-windows-amd64.exe
echo 3. Rename to: cloudflared.exe
echo 4. Place in this folder or C:\wsbs-tools\
pause
exit /b 1

:start_tunnel
echo.
echo 🔍 Checking if backend is running on port 5000...
netstat -an | find "5000" >nul
if errorlevel 1 (
    echo ⚠️  Backend not running. Please start it first:
    echo   cd backend
    echo   npm start
    echo.
    echo Press Enter when backend is ready...
    pause >nul
)

echo.
echo 🚀 Starting Cloudflare Tunnel...
echo 📋 Look for the https://...trycloudflare.com URL below
echo ================================================

if defined CLOUDFLARED_PATH (
    "%CLOUDFLARED_PATH%" tunnel --url http://localhost:5000
) else (
    cloudflared.exe tunnel --url http://localhost:5000
)
