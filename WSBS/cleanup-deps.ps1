Write-Host "🧹 Cleaning up dependencies..." -ForegroundColor Yellow
Write-Host ""

# Try to remove node_modules (ignore errors for locked files)
Write-Host "Removing node_modules..." -ForegroundColor Cyan
try {
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ node_modules removed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Some files couldn't be removed (this is normal)" -ForegroundColor Yellow
}

# Remove package-lock.json
Write-Host "Removing package-lock.json..." -ForegroundColor Cyan
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force
    Write-Host "✅ package-lock.json removed" -ForegroundColor Green
} else {
    Write-Host "ℹ️ package-lock.json not found" -ForegroundColor Blue
}

# Reinstall dependencies
Write-Host "Reinstalling dependencies..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "✅ Dependencies cleaned up!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run 'npx expo start' to start the development server" -ForegroundColor White
Write-Host "2. Test the receipt functionality" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue..."
