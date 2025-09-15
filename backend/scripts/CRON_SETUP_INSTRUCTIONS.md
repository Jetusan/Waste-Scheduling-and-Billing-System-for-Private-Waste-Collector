
# SUBSCRIPTION LIFECYCLE CRON JOB SETUP INSTRUCTIONS

## Automatic Setup (Recommended):
1. Open PowerShell as Administrator
2. Navigate to: C:\Users\jytti\OneDrive\Desktop\WASTE\backend\scripts
3. Run: .\setup_task_scheduler.ps1

## Manual Setup:
1. Open Task Scheduler (taskschd.msc)
2. Click "Create Basic Task"
3. Name: "WasteCollectionSubscriptionLifecycle"
4. Description: "Daily subscription lifecycle management"
5. Trigger: Daily at 2:00 AM
6. Action: Start a program
7. Program: cmd.exe
8. Arguments: /c "C:\Users\jytti\OneDrive\Desktop\WASTE\backend\scripts\run_subscription_cron.bat"

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
- Check logs in: C:\Users\jytti\OneDrive\Desktop\WASTE\backend\logs\
- Monitor database for status changes
- Review subscription status transitions
