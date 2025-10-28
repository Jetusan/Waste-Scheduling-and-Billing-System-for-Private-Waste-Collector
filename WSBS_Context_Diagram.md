# WSBS - Context Diagram

## System Overview
The Waste Scheduling and Billing System (WSBS) is a comprehensive waste management platform consisting of a mobile application, web admin panel, and backend API server.

```
                                    CONTEXT DIAGRAM
                          Waste Scheduling and Billing System (WSBS)
                                         
    ┌─────────────────┐                                              ┌─────────────────┐
    │    RESIDENTS    │                                              │   COLLECTORS    │
    │                 │                                              │                 │
    │ • Homeowners    │                                              │ • Waste Truck  │
    │ • Tenants       │                                              │   Drivers       │
    │ • Business      │                                              │ • Collection    │
    │   Owners        │                                              │   Teams         │
    └─────────────────┘                                              └─────────────────┘
            │                                                                │
            │ • Registration/Login                                           │ • Login/Authentication
            │ • Subscription Management                                      │ • Collection Schedule Updates
            │ • Payment Processing                                           │ • Route Management
            │ • Collection Schedule Viewing                                  │ • Special Pickup Handling
            │ • Special Pickup Requests                                      │ • Issue Reporting
            │ • Feedback/Complaints                                          │ • Payment Confirmation
            │ • Receipt Upload                                               │ • Emergency Notifications
            │                                                                │
            ▼                                                                ▼
    ┌─────────────────────────────────────────────────────────────────────────────────────┐
    │                                                                                     │
    │                    WASTE SCHEDULING AND BILLING SYSTEM                             │
    │                                  (WSBS)                                            │
    │                                                                                     │
    │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
    │  │   MOBILE APP    │  │   ADMIN PANEL   │  │  BACKEND API    │                   │
    │  │                 │  │                 │  │                 │                   │
    │  │ • React Native  │  │ • React Web App │  │ • Node.js       │                   │
    │  │ • Expo Router   │  │ • Admin Dashboard│  │ • Express.js    │                   │
    │  │ • User Interface│  │ • Reports        │  │ • REST API      │                   │
    │  │ • Push Notifs   │  │ • User Mgmt     │  │ • Authentication│                   │
    │  │                 │  │ • Analytics     │  │ • Business Logic│                   │
    │  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
    │                                                                                     │
    └─────────────────────────────────────────────────────────────────────────────────────┘
            ▲                                                                ▲
            │ • User Management                                              │ • System Administration
            │ • Report Generation                                            │ • User Approval/Rejection
            │ • Billing Oversight                                            │ • Route Assignment
            │ • Analytics & Insights                                         │ • Billing Management
            │ • Collector Assignment                                         │ • Report Generation
            │ • System Configuration                                         │ • System Monitoring
            │                                                                │
    ┌─────────────────┐                                              ┌─────────────────┐
    │  ADMINISTRATORS │                                              │  SYSTEM ADMIN   │
    │                 │                                              │                 │
    │ • System Admin  │                                              │ • Super Admin   │
    │ • Billing Admin │                                              │ • IT Support    │
    │ • Route Manager │                                              │ • Database Admin│
    │                 │                                              │                 │
    └─────────────────┘                                              └─────────────────┘

                                    EXTERNAL SYSTEMS

    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │   PAYMONGO      │    │  BREVO EMAIL    │    │   POSTGRESQL    │    │    FIREBASE     │
    │                 │    │                 │    │                 │    │                 │
    │ • GCash Payment │    │ • Email Verify  │    │ • Primary DB    │    │ • Push Notifs   │
    │ • Card Payment  │    │ • Notifications │    │ • User Data     │    │ • Real-time     │
    │ • Webhooks      │    │ • Receipts      │    │ • Transactions  │    │   Updates       │
    │                 │    │ • Alerts        │    │ • Schedules     │    │                 │
    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
            ▲                        ▲                        ▲                        ▲
            │                        │                        │                        │
            │ Payment Processing     │ Email Services         │ Data Storage          │ Notifications
            │ Transaction Status     │ SMTP Services          │ Query Processing      │ Real-time Updates
            │                        │                        │                        │
            └────────────────────────┼────────────────────────┼────────────────────────┘
                                     │                        │
                                     ▼                        ▼
                            ┌─────────────────┐    ┌─────────────────┐
                            │  TESSERACT.JS   │    │   SOCKET.IO     │
                            │                 │    │                 │
                            │ • OCR Processing│    │ • Real-time     │
                            │ • Receipt Scan  │    │   Communication │
                            │ • Text Extract  │    │ • Live Updates  │
                            │                 │    │ • Chat Support  │
                            └─────────────────┘    └─────────────────┘

                                    DATA FLOWS

    External Entity → System:
    • Residents: Registration data, payment info, service requests
    • Collectors: Collection updates, route status, issue reports
    • Administrators: System configurations, user approvals
    • PayMongo: Payment confirmations, transaction status
    • Brevo: Email delivery status, bounce notifications

    System → External Entity:
    • To Residents: Collection schedules, payment receipts, notifications
    • To Collectors: Route assignments, special pickup requests
    • To Administrators: Reports, analytics, system alerts
    • To PayMongo: Payment requests, transaction data
    • To Brevo: Email templates, notification triggers
```

## Key System Boundaries

**Internal System Components:**
- Mobile Application (React Native/Expo)
- Admin Web Panel (React)
- Backend API Server (Node.js/Express)

**External Entities:**
- **Users:** Residents, Collectors, Administrators
- **Payment Systems:** PayMongo (GCash, Cards)
- **Communication:** Brevo Email Service
- **Data Storage:** PostgreSQL Database (Neon)
- **Notifications:** Firebase Cloud Messaging
- **Processing:** Tesseract.js OCR, Socket.io Real-time

## System Interactions

**Primary Data Flows:**
1. User authentication and authorization
2. Waste collection scheduling and management
3. Billing and payment processing
4. Real-time notifications and updates
5. Reporting and analytics
6. Special pickup request handling
