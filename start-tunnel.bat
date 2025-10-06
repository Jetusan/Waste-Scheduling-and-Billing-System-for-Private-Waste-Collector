@echo off
title WSBS Cloudflare Tunnel
echo 🌐 WSBS Cloudflare Tunnel - Quick Start
echo =====================================

:: Check if cloudflared exists
if exist "C:\wsbs-tools\cloudflared.exe" (
    echo ✅ Cloudflared found
) else (
    echo ❌ Cloudflared not found. Please run setup-cloudflare-tunnel.bat first
    pause
    exit /b 1
)

echo.
echo 🔍 Checking backend server...
netstat -an | find "5000" >nul
if errorlevel 1 (
    echo ❌ Backend server not running on port 5000
    echo.
    echo Please start your backend first:
    echo   cd backend
    echo   npm start
    echo.
    echo Then run this script again.
    pause
    exit /b 1
) else (
    echo ✅ Backend server detected on port 5000
)

echo.
echo 🚀 Starting Cloudflare Tunnel...
echo 📋 Instructions:
echo   1. Wait for the tunnel URL to appear
echo   2. Copy the https://...trycloudflare.com URL
echo   3. Add to your .env file: PUBLIC_URL=https://your-url.trycloudflare.com
echo   4. Restart your backend to use the new URL
echo.
echo 🌐 Tunnel starting...
echo ==========================================

"C:\wsbs-tools\cloudflared.exe" tunnel --url http://localhost:5000
