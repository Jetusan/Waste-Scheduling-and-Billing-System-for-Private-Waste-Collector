
<#
  PowerShell script to create a Windows Task Scheduler job
  - ASCII-only output (avoid emoji/Unicode console issues)
  - Resolves the batch path relative to this script location
  - Imports ScheduledTasks module if available
  - Properly escapes quotes in cmd argument
#>

Import-Module ScheduledTasks -ErrorAction SilentlyContinue

$TaskName = "WasteCollectionSubscriptionLifecycle"

# Resolve the batch file path relative to this script
$ScriptDir = Split-Path -Parent $PSCommandPath
$ScriptPath = Join-Path $ScriptDir "run_subscription_cron.bat"
$Description = "Daily subscription lifecycle management for waste collection system"

# Validate batch file existence
if (-not (Test-Path -Path $ScriptPath)) {
    Write-Error "Batch file not found: $ScriptPath"
    exit 1
}

# Check if task already exists
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($ExistingTask) {
    Write-Host "Task '$TaskName' already exists. Updating..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create new scheduled task
$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$ScriptPath`""
$Trigger = New-ScheduledTaskTrigger -Daily -At "02:00AM"
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -LogonType Interactive

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description $Description

Write-Host "Successfully created scheduled task: $TaskName"
Write-Host "Scheduled to run daily at 2:00 AM"
Write-Host "Task will execute: $ScriptPath"
