@echo off

REM Determine the directory of this script
set SCRIPT_DIR=%~dp0

REM Move to project root (one level up from scripts)
pushd "%SCRIPT_DIR%.."

REM Run the cron job
node ".\scripts\subscription_lifecycle_cron.js"

REM Return to original directory
popd

echo Subscription lifecycle cron completed at %date% %time%
