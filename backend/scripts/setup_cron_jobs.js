// setup_cron_jobs.js - Windows Task Scheduler Setup for Subscription Lifecycle
const fs = require('fs');
const path = require('path');

function setupWindowsCronJobs() {
  console.log('🕐 Setting up Windows Task Scheduler for Subscription Lifecycle\n');
  console.log('=' .repeat(60));
  
  const projectPath = path.resolve(__dirname, '..');
  const cronScriptPath = path.join(projectPath, 'scripts', 'subscription_lifecycle_cron.js');
  
  // Create batch file for Windows Task Scheduler
  const batchContent = `@echo off
cd /d "${projectPath}"
node "${cronScriptPath}"
echo Subscription lifecycle cron completed at %date% %time%
`;

  const batchFilePath = path.join(projectPath, 'scripts', 'run_subscription_cron.bat');
  
  try {
    fs.writeFileSync(batchFilePath, batchContent);
    console.log(`✅ Created batch file: ${batchFilePath}`);
    
    // Create PowerShell script to set up Windows Task Scheduler
    const powershellScript = `
# PowerShell script to create Windows Task Scheduler job
$TaskName = "WasteCollectionSubscriptionLifecycle"
$ScriptPath = "${batchFilePath}"
$Description = "Daily subscription lifecycle management for waste collection system"

# Check if task already exists
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($ExistingTask) {
    Write-Host "⚠️  Task '$TaskName' already exists. Updating..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create new scheduled task
$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c \\"$ScriptPath\\""
$Trigger = New-ScheduledTaskTrigger -Daily -At "02:00AM"
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description $Description

Write-Host "✅ Successfully created scheduled task: $TaskName"
Write-Host "🕐 Scheduled to run daily at 2:00 AM"
Write-Host "📝 Task will execute: $ScriptPath"
`;

    const psFilePath = path.join(projectPath, 'scripts', 'setup_task_scheduler.ps1');
    fs.writeFileSync(psFilePath, powershellScript);
    
    console.log(`✅ Created PowerShell setup script: ${psFilePath}`);
    
    // Create manual setup instructions
    const instructions = `
# SUBSCRIPTION LIFECYCLE CRON JOB SETUP INSTRUCTIONS

## Automatic Setup (Recommended):
1. Open PowerShell as Administrator
2. Navigate to: ${projectPath}\\scripts
3. Run: .\\setup_task_scheduler.ps1

## Manual Setup:
1. Open Task Scheduler (taskschd.msc)
2. Click "Create Basic Task"
3. Name: "WasteCollectionSubscriptionLifecycle"
4. Description: "Daily subscription lifecycle management"
5. Trigger: Daily at 2:00 AM
6. Action: Start a program
7. Program: cmd.exe
8. Arguments: /c "${batchFilePath}"

## Verify Setup:
- Task Scheduler > Task Scheduler Library
- Look for "WasteCollectionSubscriptionLifecycle"
- Right-click > Run to test

## What the cron job does:
✅ Marks overdue invoices
✅ Suspends subscriptions after grace period
✅ Cancels long-overdue subscriptions  
✅ Generates monthly invoices for active subscriptions
✅ Logs all activities for monitoring

## Monitoring:
- Check logs in: ${projectPath}\\logs\\
- Monitor database for status changes
- Review subscription status transitions
`;

    const instructionsPath = path.join(projectPath, 'scripts', 'CRON_SETUP_INSTRUCTIONS.md');
    fs.writeFileSync(instructionsPath, instructions);
    
    console.log(`✅ Created setup instructions: ${instructionsPath}`);
    
    console.log('\n🎯 CRON JOB SETUP COMPLETE!');
    console.log('\nNext steps:');
    console.log('1. Run PowerShell as Administrator');
    console.log(`2. Execute: ${psFilePath}`);
    console.log('3. Verify task in Task Scheduler');
    console.log('4. Test with right-click > Run');
    
    return {
      batchFile: batchFilePath,
      powershellScript: psFilePath,
      instructions: instructionsPath
    };
    
  } catch (error) {
    console.error('❌ Error setting up cron jobs:', error.message);
    return null;
  }
}

// Create logs directory if it doesn't exist
function createLogsDirectory() {
  const logsDir = path.resolve(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`✅ Created logs directory: ${logsDir}`);
  }
}

console.log('🚀 Initializing Cron Job Setup...\n');
createLogsDirectory();
setupWindowsCronJobs();
