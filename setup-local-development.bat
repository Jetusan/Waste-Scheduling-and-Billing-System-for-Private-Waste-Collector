@echo off
title WSBS Local Development Setup
echo 🚀 WSBS Local Development Setup
echo ================================

echo.
echo 📋 Setting up WSBS for local development...

:: Check if we're in the right directory
if not exist "backend" (
    echo ❌ Error: Please run this script from the WASTE root directory
    echo Current directory should contain: backend, admin, WSBS folders
    pause
    exit /b 1
)

echo.
echo 🔧 Step 1: Backend Setup
echo ------------------------
cd backend

:: Check if .env exists, if not create from template
if not exist ".env" (
    if exist ".env.local.template" (
        echo 📄 Creating .env from template...
        copy ".env.local.template" ".env"
        echo ⚠️  IMPORTANT: Please update .env with your PayMongo credentials!
        echo    Get them from: https://dashboard.paymongo.com/developers
    ) else (
        echo ❌ .env.local.template not found. Please create .env manually.
    )
) else (
    echo ✅ .env file already exists
)

echo 📦 Installing backend dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Backend npm install failed
    pause
    exit /b 1
)

echo.
echo 🎨 Step 2: Admin Dashboard Setup
echo --------------------------------
cd ..\admin

:: Check if admin .env exists
if not exist ".env" (
    if exist ".env.template" (
        echo 📄 Creating admin .env from template...
        copy ".env.template" ".env"
    ) else (
        echo ⚠️  Admin .env.template not found
    )
) else (
    echo ✅ Admin .env file already exists
)

echo 📦 Installing admin dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Admin npm install failed
    pause
    exit /b 1
)

echo.
echo 📱 Step 3: Mobile App Setup
echo ---------------------------
cd ..\WSBS

echo 📦 Installing mobile app dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Mobile app npm install failed
    pause
    exit /b 1
)

echo.
echo ✅ Setup Complete!
echo ==================

echo.
echo 🎯 Next Steps:
echo 1. Update backend/.env with your PayMongo credentials
echo 2. Start the backend: cd backend && npm start
echo 3. Start the admin: cd admin && npm start
echo 4. Start the mobile app: cd WSBS && expo start
echo.
echo 📋 Important Notes:
echo - Backend runs on: http://localhost:5000
echo - Admin runs on: http://localhost:3000
echo - Mobile app connects to backend on port 5000
echo - For production builds, set EXPO_PUBLIC_FORCE_PRODUCTION=true
echo.
echo 🔗 PayMongo Setup:
echo 1. Go to: https://dashboard.paymongo.com/developers
echo 2. Get your test API keys
echo 3. Update backend/.env with:
echo    PAYMONGO_SECRET_KEY=sk_test_...
echo    PAYMONGO_PUBLIC_KEY=pk_test_...
echo    PAYMONGO_WEBHOOK_SECRET=whsec_...

cd ..
pause
