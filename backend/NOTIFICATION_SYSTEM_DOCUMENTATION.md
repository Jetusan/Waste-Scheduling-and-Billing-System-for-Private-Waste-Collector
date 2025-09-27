# Notification System Implementation

## Overview
This document outlines the comprehensive notification system implemented for the Waste Scheduling and Billing System (WSBS). The system addresses previously missing notification flows and provides automated, event-driven notifications for all user types.

## Missing Notification Flows (Now Implemented)

### 1. **Subscription & Payment Notifications** ✅
- **Subscription Activation**: Notifies users when their subscription is successfully activated
- **Payment Confirmation**: Confirms GCash and Cash payments with reference numbers
- **Invoice Generation**: Alerts users when new invoices are created
- **Payment Overdue**: Warns users about overdue payments
- **Subscription Expiration**: Reminds users about upcoming subscription expiry
- **Subscription Reactivation**: Confirms when cancelled subscriptions are reactivated
- **Late Fee Addition**: Notifies users when late fees are added to invoices

### 2. **Collection Schedule Notifications** ✅
- **Collection Reminders**: Daily reminders sent 24 hours before collection
- **Collection Completion**: Confirms successful waste collection
- **Schedule Changes**: Notifies about collection date/time changes
- **Collection Delays**: Bulk notifications for weather/emergency delays
- **Collector Assignment**: Informs users about assigned collectors

### 3. **Administrative Notifications** ✅
- **Monthly Invoice Generation**: Notifies admins about bulk invoice creation
- **Payment Received**: Alerts admins about incoming payments
- **Subscription Activities**: Admin alerts for new/reactivated subscriptions
- **Overdue Payment Alerts**: Admin notifications for overdue accounts

## Implementation Files

### Core Services
1. **`subscriptionNotificationService.js`** - Handles subscription and payment notifications
2. **`collectionNotificationService.js`** - Manages collection-related notifications
3. **`automatedNotificationScheduler.js`** - Automated time-based notifications using cron jobs

### Integration Points
- **`billingController.js`** - Payment confirmations, invoice generation, late fees
- **`collectorController.js`** - Collection completion notifications
- **`app.js`** - Automated scheduler initialization

## Automated Notification Schedule

| Notification Type | Schedule | Description |
|------------------|----------|-------------|
| Collection Reminders | Daily 6:00 PM | 24-hour advance collection reminders |
| Overdue Payment Check | Daily 9:00 AM | Identifies and notifies overdue payments |
| Payment Reminders | Every 3 days 2:00 PM | Reminds about upcoming due dates |
| Subscription Expiration | Weekly Mon 10:00 AM | 5-day advance expiration warnings |
| Monthly Invoice Generation | 1st of month 8:00 AM | Triggers monthly billing cycle |

## Notification Types

### User Notifications
- `subscription_activated`
- `payment_confirmed`
- `invoice_generated`
- `payment_overdue`
- `subscription_expiring`
- `subscription_reactivated`
- `late_fee_added`
- `collection_reminder`
- `collection_completed`
- `schedule_change`
- `collector_assigned`
- `suspension_warning`
- `service_suspended`
- `collection_delayed`
- `payment_reminder`

### Admin Notifications
- `subscription_activated`
- `payment_received`
- `subscription_reactivated`
- `payment_overdue`
- `monthly_invoices_generated`
- `bulk_notification_sent`

## Usage Examples

### Manual Notification Triggers
```javascript
// Payment confirmation
await notifyPaymentConfirmed(userId, {
  amount: 199,
  method: 'GCash',
  reference_number: 'src_abc123'
});

// Subscription activation
await notifySubscriptionActivated(userId, {
  plan_name: 'Full Plan',
  price: 199,
  next_collection_date: '2025-09-17'
});

// Collection completion
await notifyCollectionCompleted(userId, {
  collection_date: '2025-09-16',
  next_collection_date: '2025-09-23'
});
```

### Automated Triggers
The system automatically sends notifications for:
- Overdue payments (daily check)
- Collection reminders (24 hours before)
- Payment reminders (for upcoming due dates)
- Subscription expiration warnings (5 days before)

## Database Schema
The notification system uses the existing `notifications` table with the following structure:
```sql
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    notification_type VARCHAR(50)
);
```

## API Endpoints
Existing notification endpoints remain unchanged:
- `GET /api/notifications/` - Admin notifications
- `GET /api/notifications/me` - User notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `GET /api/notifications/unread-count` - Unread count

## Installation Requirements
Add to package.json:
```json
{
  "dependencies": {
    "node-cron": "^3.0.3"
  }
}
```

## Configuration
The automated scheduler initializes automatically when the application starts. No additional configuration is required.

## Benefits
1. **Complete Coverage**: All user flows now have appropriate notifications
2. **Automated Operations**: Reduces manual intervention for routine notifications
3. **User Experience**: Keeps users informed about their service status
4. **Admin Efficiency**: Provides real-time alerts for important events
5. **Payment Compliance**: Proactive reminders reduce overdue payments
6. **Service Quality**: Collection reminders improve user satisfaction

## Future Enhancements
- SMS notifications integration
- Email notifications for critical alerts
- Push notifications for mobile app
- Notification preferences per user
- Advanced notification analytics
