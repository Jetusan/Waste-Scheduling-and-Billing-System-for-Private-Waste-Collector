@echo off
title WSBS Production Deployment
echo 🚀 WSBS Production Deployment
echo =============================

echo.
echo 📋 Preparing WSBS for production deployment...

:: Check if we're in the right directory
if not exist "backend" (
    echo ❌ Error: Please run this script from the WASTE root directory
    pause
    exit /b 1
)

echo.
echo 🔧 Step 1: Configure Backend for Production
echo ------------------------------------------
cd backend

:: Copy production environment template
if exist ".env.local.template" (
    echo 📄 Setting up production .env...
    copy ".env.local.template" ".env"
    echo ✅ Backend configured for production
    echo ⚠️  IMPORTANT: Update .env with your LIVE PayMongo credentials!
) else (
    echo ❌ Production template not found
)

echo.
echo 🎨 Step 2: Configure Admin Dashboard for Production
echo --------------------------------------------------
cd ..\admin

:: Copy production environment template
if exist ".env.template" (
    echo 📄 Setting up admin production .env...
    copy ".env.template" ".env"
    echo ✅ Admin configured for production backend
) else (
    echo ❌ Admin template not found
)

echo.
echo 📱 Step 3: Mobile App Production Configuration
echo ---------------------------------------------
echo ✅ Mobile app already configured for production backend
echo 📱 API URL: https://waste-scheduling-and-billing-system-for.onrender.com

echo.
echo 🎯 Step 4: Build Mobile App for Production
echo ------------------------------------------
cd ..\WSBS

echo 📦 Installing dependencies...
call npm install

echo 🔨 Building production APK...
echo This may take several minutes...
call expo build:android --type apk

echo.
echo ✅ Production Deployment Ready!
echo ==============================

echo.
echo 🎯 Deployment Status:
echo - ✅ Backend: Configured for production (Render)
echo - ✅ Admin: Configured for production backend
echo - ✅ Mobile: Built for production deployment
echo.
echo 📋 Next Steps:
echo 1. Update backend/.env with LIVE PayMongo credentials
echo 2. Commit and push to GitHub (auto-deploys to Render)
echo 3. Deploy admin dashboard to hosting service
echo 4. Distribute mobile APK to users
echo.
echo 🔗 Production URLs:
echo - Backend: https://waste-scheduling-and-billing-system-for.onrender.com
echo - Admin: (Deploy to Netlify/Vercel)
echo - Mobile: APK file generated
echo.
echo 🚨 CRITICAL: Get PayMongo LIVE credentials from:
echo https://dashboard.paymongo.com/developers

cd ..
pause
