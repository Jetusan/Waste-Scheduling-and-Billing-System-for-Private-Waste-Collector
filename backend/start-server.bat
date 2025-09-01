@echo off
echo Starting WASTE Backend Server...
echo.

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found!
    echo 💡 Please create a .env file based on .env.example
    echo.
    echo Copy .env.example to .env and configure your settings:
    echo - PayMongo API keys
    echo - Database credentials
    echo - JWT secret
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)

REM Start the server
echo 🚀 Starting server on port 5000...
echo 🌐 Ngrok URL: https://d9bcbd3056f9.ngrok-free.app
echo.
npm run dev
