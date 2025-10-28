# WSBS - Level 0 Data Flow Diagram (DFD)

## System Overview
This Level 0 DFD shows the main processes within the Waste Scheduling and Billing System and how data flows between them.

```
                                    LEVEL 0 DATA FLOW DIAGRAM
                          Waste Scheduling and Billing System (WSBS)

    ┌─────────────────┐                                              ┌─────────────────┐
    │    RESIDENTS    │                                              │   COLLECTORS    │
    │                 │                                              │                 │
    └─────────────────┘                                              └─────────────────┘
            │                                                                │
            │ 1. Registration Data                                           │ 8. Login Credentials
            │ 2. Payment Information                                         │ 9. Collection Status Updates
            │ 3. Special Pickup Requests                                     │ 10. Route Completion Data
            │ 4. Feedback/Complaints                                         │ 11. Issue Reports
            │ 5. Receipt Images                                              │ 12. Emergency Notifications
            │                                                                │
            ▼                                                                ▼
    ┌─────────────────────────────────────────────────────────────────────────────────────┐
    │                                                                                     │
    │                           WSBS CORE PROCESSES                                      │
    │                                                                                     │
    │  ┌─────────────────────────────────────────────────────────────────────────────┐   │
    │  │                          PROCESS 1.0                                       │   │
    │  │                    USER MANAGEMENT SYSTEM                                  │   │
    │  │                                                                           │   │
    │  │  • User Registration & Authentication                                     │   │
    │  │  • Role-based Access Control                                             │   │
    │  │  • Profile Management                                                    │   │
    │  │  • Email Verification                                                    │   │
    │  │  • Password Reset                                                        │   │
    │  └─────────────────────────────────────────────────────────────────────────────┘   │
    │                                    │                                               │
    │                                    ▼                                               │
    │                            ┌─────────────────┐                                    │
    │                            │   D1: USERS     │                                    │
    │                            │                 │                                    │
    │                            │ • User Profiles │                                    │
    │                            │ • Credentials   │                                    │
    │                            │ • Roles & Perms │                                    │
    │                            │ • Addresses     │                                    │
    │                            └─────────────────┘                                    │
    │                                    │                                               │
    │  ┌─────────────────────────────────┼─────────────────────────────────────────┐   │
    │  │                          PROCESS 2.0                                     │   │
    │  │                   COLLECTION SCHEDULING SYSTEM                           │   │
    │  │                                                                         │   │
    │  │  • Route Planning & Optimization                                        │   │
    │  │  • Collection Schedule Generation                                       │   │
    │  │  • Collector Assignment                                                 │   │
    │  │  • Schedule Notifications                                               │   │
    │  │  • Real-time Status Updates                                             │   │
    │  └─────────────────────────────────────────────────────────────────────────┘   │
    │                                    │                                               │
    │                                    ▼                                               │
    │                            ┌─────────────────┐                                    │
    │                            │ D2: SCHEDULES   │                                    │
    │                            │                 │                                    │
    │                            │ • Collection    │                                    │
    │                            │   Schedules     │                                    │
    │                            │ • Route Data    │                                    │
    │                            │ • Assignments   │                                    │
    │                            └─────────────────┘                                    │
    │                                    │                                               │
    │  ┌─────────────────────────────────┼─────────────────────────────────────────┐   │
    │  │                          PROCESS 3.0                                     │   │
    │  │                     BILLING & PAYMENT SYSTEM                             │   │
    │  │                                                                         │   │
    │  │  • Subscription Management                                              │   │
    │  │  • Invoice Generation                                                   │   │
    │  │  • Payment Processing (GCash/Cards)                                     │   │
    │  │  • Receipt Management                                                   │   │
    │  │  • Payment History Tracking                                             │   │
    │  └─────────────────────────────────────────────────────────────────────────┘   │
    │                                    │                                               │
    │                                    ▼                                               │
    │                            ┌─────────────────┐                                    │
    │                            │ D3: BILLING     │                                    │
    │                            │                 │                                    │
    │                            │ • Invoices      │                                    │
    │                            │ • Payments      │                                    │
    │                            │ • Subscriptions │                                    │
    │                            │ • Receipts      │                                    │
    │                            └─────────────────┘                                    │
    │                                    │                                               │
    │  ┌─────────────────────────────────┼─────────────────────────────────────────┐   │
    │  │                          PROCESS 4.0                                     │   │
    │  │                    SPECIAL PICKUP MANAGEMENT                             │   │
    │  │                                                                         │   │
    │  │  • Special Pickup Requests                                              │   │
    │  │  • Price Negotiation                                                    │   │
    │  │  • Collector Assignment                                                 │   │
    │  │  • Status Tracking                                                      │   │
    │  │  • Completion Confirmation                                              │   │
    │  └─────────────────────────────────────────────────────────────────────────┘   │
    │                                    │                                               │
    │                                    ▼                                               │
    │                            ┌─────────────────┐                                    │
    │                            │D4: SPECIAL      │                                    │
    │                            │   PICKUPS       │                                    │
    │                            │                 │                                    │
    │                            │ • Pickup        │                                    │
    │                            │   Requests      │                                    │
    │                            │ • Status Data   │                                    │
    │                            │ • Pricing Info  │                                    │
    │                            └─────────────────┘                                    │
    │                                    │                                               │
    │  ┌─────────────────────────────────┼─────────────────────────────────────────┐   │
    │  │                          PROCESS 5.0                                     │   │
    │  │                    NOTIFICATION & COMMUNICATION                          │   │
    │  │                                                                         │   │
    │  │  • Push Notifications                                                   │   │
    │  │  • Email Notifications                                                  │   │
    │  │  • SMS Alerts                                                           │   │
    │  │  • Real-time Chat                                                       │   │
    │  │  • System Announcements                                                 │   │
    │  └─────────────────────────────────────────────────────────────────────────┘   │
    │                                    │                                               │
    │                                    ▼                                               │
    │                            ┌─────────────────┐                                    │
    │                            │D5: NOTIFICATIONS│                                    │
    │                            │                 │                                    │
    │                            │ • Message Queue │                                    │
    │                            │ • Delivery Log  │                                    │
    │                            │ • Templates     │                                    │
    │                            │ • Preferences   │                                    │
    │                            └─────────────────┘                                    │
    │                                    │                                               │
    │  ┌─────────────────────────────────┼─────────────────────────────────────────┐   │
    │  │                          PROCESS 6.0                                     │   │
    │  │                      REPORTING & ANALYTICS                               │   │
    │  │                                                                         │   │
    │  │  • Collection Reports                                                   │   │
    │  │  • Financial Reports                                                    │   │
    │  │  • Performance Analytics                                                │   │
    │  │  • User Activity Reports                                                │   │
    │  │  • System Health Monitoring                                             │   │
    │  └─────────────────────────────────────────────────────────────────────────┘   │
    │                                    │                                               │
    │                                    ▼                                               │
    │                            ┌─────────────────┐                                    │
    │                            │ D6: REPORTS     │                                    │
    │                            │                 │                                    │
    │                            │ • Report Data   │                                    │
    │                            │ • Analytics     │                                    │
    │                            │ • Metrics       │                                    │
    │                            │ • Logs          │                                    │
    │                            └─────────────────┘                                    │
    │                                                                                     │
    └─────────────────────────────────────────────────────────────────────────────────────┘
            ▲                                                                ▲
            │ 13. User Reports                                               │ 20. System Reports
            │ 14. Payment Receipts                                           │ 21. User Management
            │ 15. Collection Schedules                                       │ 22. Route Assignments
            │ 16. Notifications                                              │ 23. Billing Oversight
            │ 17. Special Pickup Status                                      │ 24. Analytics Data
            │                                                                │
    ┌─────────────────┐                                              ┌─────────────────┐
    │  ADMINISTRATORS │                                              │  SYSTEM ADMIN   │
    │                 │                                              │                 │
    └─────────────────┘                                              └─────────────────┘

                                    EXTERNAL SYSTEMS

    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │   PAYMONGO      │    │  BREVO EMAIL    │    │   POSTGRESQL    │    │    FIREBASE     │
    │                 │    │                 │    │                 │    │                 │
    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
            ▲                        ▲                        ▲                        ▲
            │                        │                        │                        │
            │ Payment Requests       │ Email Templates        │ Data Queries          │ Push Notifications
            │ Transaction Status     │ Delivery Status        │ Database Updates      │ Real-time Updates
            │                        │                        │                        │
            └────────────────────────┼────────────────────────┼────────────────────────┘
                                     │                        │
                                     ▼                        ▼
                            ┌─────────────────┐    ┌─────────────────┐
                            │  TESSERACT.JS   │    │   SOCKET.IO     │
                            │                 │    │                 │
                            │ OCR Processing  │    │ Real-time Comm  │
                            │ Receipt Data    │    │ Live Updates    │
                            └─────────────────┘    └─────────────────┘
```

## Detailed Process Descriptions

### Process 1.0: User Management System
**Inputs:**
- Registration data from Residents/Collectors
- Login credentials
- Profile update requests
- Password reset requests

**Outputs:**
- User authentication tokens
- Profile confirmations
- Email verification links
- Access permissions

**Data Stores:**
- D1: Users (profiles, credentials, roles, addresses)

### Process 2.0: Collection Scheduling System
**Inputs:**
- Route planning data
- Collector availability
- Collection area assignments
- Schedule modification requests

**Outputs:**
- Collection schedules
- Route assignments
- Schedule notifications
- Status updates

**Data Stores:**
- D2: Schedules (collection schedules, routes, assignments)

### Process 3.0: Billing & Payment System
**Inputs:**
- Subscription requests
- Payment information
- Receipt images (OCR processed)
- Payment confirmations from PayMongo

**Outputs:**
- Generated invoices
- Payment receipts
- Billing notifications
- Payment status updates

**Data Stores:**
- D3: Billing (invoices, payments, subscriptions, receipts)

### Process 4.0: Special Pickup Management
**Inputs:**
- Special pickup requests from residents
- Collector acceptance/rejection
- Price negotiations
- Completion confirmations

**Outputs:**
- Pickup assignments
- Status notifications
- Price confirmations
- Completion receipts

**Data Stores:**
- D4: Special Pickups (requests, status, pricing)

### Process 5.0: Notification & Communication
**Inputs:**
- System events
- User actions
- Schedule changes
- Payment confirmations

**Outputs:**
- Push notifications (Firebase)
- Email notifications (Brevo)
- SMS alerts
- Real-time updates (Socket.io)

**Data Stores:**
- D5: Notifications (message queue, delivery logs, templates)

### Process 6.0: Reporting & Analytics
**Inputs:**
- Collection data
- Payment records
- User activity logs
- System performance metrics

**Outputs:**
- Collection reports
- Financial reports
- Performance analytics
- Dashboard data

**Data Stores:**
- D6: Reports (report data, analytics, metrics, logs)

## Key Data Flows

1. **User Registration Flow:** Residents → Process 1.0 → D1: Users → Email Verification
2. **Collection Scheduling Flow:** Admin → Process 2.0 → D2: Schedules → Collectors
3. **Payment Processing Flow:** Residents → Process 3.0 → PayMongo → D3: Billing
4. **Special Pickup Flow:** Residents → Process 4.0 → D4: Special Pickups → Collectors
5. **Notification Flow:** System Events → Process 5.0 → Firebase/Brevo → Users
6. **Reporting Flow:** System Data → Process 6.0 → D6: Reports → Administrators
