# WSBS Cloudflare Tunnel Setup - PowerShell Version
Write-Host "🌐 WSBS Cloudflare Tunnel Setup" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Create tools directory
$toolsDir = "C:\wsbs-tools"
if (!(Test-Path $toolsDir)) {
    New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
    Write-Host "📁 Created tools directory: $toolsDir" -ForegroundColor Yellow
}

$cloudflaredPath = "$toolsDir\cloudflared.exe"

# Check if already installed
if (Test-Path $cloudflaredPath) {
    Write-Host "✅ Cloudflared already installed at: $cloudflaredPath" -ForegroundColor Green
} else {
    Write-Host "📥 Downloading Cloudflare Tunnel..." -ForegroundColor Yellow
    
    try {
        $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        Invoke-WebRequest -Uri $url -OutFile $cloudflaredPath -UseBasicParsing
        Write-Host "✅ Download completed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Please download manually from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/" -ForegroundColor Yellow
        exit 1
    }
}

# Check if backend is running
Write-Host ""
Write-Host "🔍 Checking if backend server is running..." -ForegroundColor Yellow

$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if (!$port5000) {
    Write-Host "⚠️  Backend server not detected on port 5000" -ForegroundColor Yellow
    Write-Host "Please start your backend server first:" -ForegroundColor White
    Write-Host "  cd backend" -ForegroundColor Cyan
    Write-Host "  npm start" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press Enter when your backend is ready..." -ForegroundColor Yellow
    Read-Host
}

Write-Host ""
Write-Host "🚀 Starting Cloudflare Tunnel..." -ForegroundColor Green
Write-Host "📋 Instructions:" -ForegroundColor White
Write-Host "  1. Wait for the tunnel URL to appear below" -ForegroundColor White
Write-Host "  2. Copy the https://...trycloudflare.com URL" -ForegroundColor White
Write-Host "  3. Add to your .env file: PUBLIC_URL=https://your-url.trycloudflare.com" -ForegroundColor White
Write-Host "  4. Restart your backend to use the new URL" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Tunnel Output:" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Start the tunnel
& $cloudflaredPath tunnel --url http://localhost:5000
