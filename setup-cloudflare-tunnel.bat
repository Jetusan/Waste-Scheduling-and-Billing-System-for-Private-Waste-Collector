@echo off
echo 🌐 WSBS Cloudflare Tunnel Setup
echo ================================

echo.
echo 📥 Step 1: Downloading Cloudflare Tunnel (cloudflared)...
echo Please wait while we download the latest version...

:: Create temp directory
if not exist "%TEMP%\wsbs-setup" mkdir "%TEMP%\wsbs-setup"
cd /d "%TEMP%\wsbs-setup"

:: Download cloudflared for Windows
echo Downloading cloudflared.exe...
curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -o cloudflared.exe

if exist cloudflared.exe (
    echo ✅ Download successful!
    
    :: Move to a permanent location
    if not exist "C:\wsbs-tools" mkdir "C:\wsbs-tools"
    move cloudflared.exe "C:\wsbs-tools\cloudflared.exe"
    
    :: Add to PATH temporarily
    set PATH=%PATH%;C:\wsbs-tools
    
    echo.
    echo ✅ Cloudflared installed successfully!
    echo 📍 Location: C:\wsbs-tools\cloudflared.exe
    
) else (
    echo ❌ Download failed. Please download manually from:
    echo https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
    pause
    exit /b 1
)

echo.
echo 🚀 Step 2: Starting Cloudflare Tunnel...
echo This will create a secure tunnel to your local server.

:: Check if backend is running
echo Checking if backend server is running on port 5000...
netstat -an | find "5000" >nul
if errorlevel 1 (
    echo.
    echo ⚠️  WARNING: No server detected on port 5000
    echo Please make sure your backend is running:
    echo    cd backend
    echo    npm start
    echo.
    echo Press any key when your backend is ready...
    pause >nul
)

echo.
echo 🌐 Starting tunnel to localhost:5000...
echo ⏳ This may take a few seconds...
echo.

:: Start the tunnel and capture output
"C:\wsbs-tools\cloudflared.exe" tunnel --url http://localhost:5000

echo.
echo 🎉 Tunnel setup complete!
echo Copy the https://... URL from above and add it to your .env file:
echo PUBLIC_URL=https://your-tunnel-url.trycloudflare.com
echo.
pause
