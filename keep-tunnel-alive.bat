@echo off
title WSBS Persistent Tunnel
echo 🌐 WSBS Persistent Tunnel - Auto Restart
echo ========================================

:start_tunnel
echo.
echo 🚀 Starting SSH tunnel...
echo 📋 Tunnel will auto-restart if disconnected
echo.

ssh -R 80:localhost:5000 serveo.net

echo.
echo ⚠️  Tunnel disconnected. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto start_tunnel
