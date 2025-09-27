# Waste Scheduling and Billing System (WSBS) - Complete Data Flow Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Database Schema & Relationships](#database-schema--relationships)
4. [Core Data Flows](#core-data-flows)
5. [API Endpoints & Data Flow](#api-endpoints--data-flow)
6. [Payment & Subscription Lifecycle](#payment--subscription-lifecycle)
7. [Mobile App Integration](#mobile-app-integration)
8. [Collection Management Flow](#collection-management-flow)
9. [Admin Dashboard Data Flow](#admin-dashboard-data-flow)
10. [Security & Authentication Flow](#security--authentication-flow)

---

## System Overview

The Waste Scheduling and Billing System (WSBS) is a comprehensive waste management platform consisting of:
- **Mobile App (React Native)**: Resident and collector interfaces
- **Admin Dashboard (React)**: Web-based management interface
- **Backend API (Node.js/Express)**: Core business logic and data processing
- **PostgreSQL Database**: Data persistence layer
- **PayMongo Integration**: Payment processing

### Key Stakeholders
- **Residents**: Subscribe to waste collection services, make payments, track schedules
- **Collectors**: Manage collection routes, update pickup status, collect payments
- **Administrators**: Oversee operations, generate reports, manage system configuration

---

## Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │  Admin Dashboard │    │   PayMongo API  │
│  (React Native) │    │     (React)     │    │   (External)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴───────────┐
                    │    Backend API Server   │
                    │    (Node.js/Express)    │
                    │                         │
                    │  ┌─────────────────┐   │
                    │  │   Controllers   │   │
                    │  │   Middleware    │   │
                    │  │     Routes      │   │
                    │  │     Models      │   │
                    │  └─────────────────┘   │
                    └─────────────┬───────────┘
                                  │
                    ┌─────────────┴───────────┐
                    │   PostgreSQL Database   │
                    │                         │
                    │  ┌─────────────────┐   │
                    │  │ Core Tables     │   │
                    │  │ Billing Tables  │   │
                    │  │ Collection Data │   │
                    │  │ User Management │   │
                    │  └─────────────────┘   │
                    └─────────────────────────┘
```

---

## Database Schema & Relationships

### Core Entity Relationships

```
users (1) ──────────── (1) user_names
  │                           
  │ (1)                       
  │                           
  └── residents (1) ─────── (M) customer_subscriptions
           │                           │
           │                           │ (M)
           │                           │
           │                    subscription_plans (1)
           │                           │
           │                           │ (1)
           │                           │
           │                    invoices (M) ─── (M) payments
           │
           │ (M)
           │
    collection_schedules ── route_stops ── collection_routes
           │                                    │
           │ (M)                               │ (1)
           │                                    │
    collection_teams ── trucks            route_types (1)
           │              │
           │ (1)          │ (1)
           │              │
    collectors (M) ───────┘
```

### Key Tables and Their Purpose

#### User Management Tables
- **users**: Core user authentication and profile data
- **user_names**: Normalized name storage (first, middle, last)
- **residents**: Resident-specific data and subscription status
- **roles**: User role definitions (admin, collector, resident)

#### Geographic Tables
- **cities**: City definitions (primarily General Santos City)
- **barangays**: Barangay subdivisions within cities
- **subdivisions**: Residential subdivisions within barangays
- **addresses**: Normalized address storage

#### Collection Management Tables
- **collection_schedules**: Scheduled waste collection events
- **collection_routes**: Defined collection routes
- **route_stops**: Individual stops within routes
- **collection_teams**: Team assignments for collections
- **trucks**: Fleet management data
- **collectors**: Collector-specific information

#### Billing & Subscription Tables
- **subscription_plans**: Available service plans (Household ₱1200/month, Mixed/Heavy ₱850/week)
- **customer_subscriptions**: Active subscriber relationships
- **invoices**: Generated billing statements
- **payments**: Payment records and history

---

## Core Data Flows

### 1. User Registration & Authentication Flow

```
Mobile App Registration Request
          ↓
    Validation & Normalization
    - Phone number formatting
    - Address verification
    - Name parsing
          ↓
    Database Transaction
    1. Insert into user_names
    2. Insert into addresses
    3. Insert into users
    4. Insert into residents
          ↓
    JWT Token Generation
          ↓
    Response with Profile Data
```

**Data Path**: `Mobile App → /api/auth/register → authController.js → Database → JWT Response`

### 2. Subscription Creation Flow

```
Payment Method Selection
          ↓
    Create Subscription Request
    - Plan selection (auto-assigned ₱199 plan)
    - Payment method (GCash/Cash)
          ↓
    Backend Processing
    1. Validate user authentication
    2. Create customer_subscription (status: 'pending_payment')
    3. Generate initial invoice
    4. Return subscription details
          ↓
    Payment Processing
    - GCash: Redirect to PayMongo
    - Cash: Mark for collection
          ↓
    Subscription Activation
    - Update status to 'active'
    - Set billing dates
```

**Data Path**: `PaymentPage.jsx → /api/billing/mobile-subscription → billingController.js → Database`

### 3. Payment Processing Flow

#### GCash Payment Flow
```
User Selects GCash
          ↓
    Create PayMongo Source
    - Amount conversion (PHP to centavos)
    - Generate checkout URL
          ↓
    Redirect to PayMongo
          ↓
    Payment Completion
    - Deep link return (wsbs://payment/success)
    - Status polling mechanism
          ↓
    Payment Confirmation
    - Update payment_sources table
    - Activate subscription
    - Generate receipt
```

#### Cash Payment Flow
```
User Selects Cash on Collection
          ↓
    Create Pending Subscription
    - Status: 'pending_payment'
    - Instructions for collector payment
          ↓
    Collector Confirmation
    - Payment collection during pickup
    - Mobile confirmation interface
          ↓
    Payment Recording
    - Update subscription status
    - Generate payment record
```

---

## API Endpoints & Data Flow

### Authentication Endpoints
- `POST /api/auth/register` - User registration with address normalization
- `POST /api/auth/login` - JWT token generation
- `GET /api/auth/profile` - User profile retrieval
- `POST /api/auth/reset-password` - Password reset workflow

### Billing & Subscription Endpoints
- `GET /api/billing/subscription-plans` - Available plans
- `POST /api/billing/mobile-subscription` - Create subscription
- `POST /api/billing/create-gcash-source` - PayMongo integration
- `POST /api/billing/confirm-gcash-payment` - Payment confirmation
- `GET /api/billing/payment-status/:sourceId` - Payment status polling

### Collection Management Endpoints
- `GET /api/collection-schedules` - Schedule retrieval
- `POST /api/assignments/update-status` - Collection status updates
- `GET /api/dashboard/stats` - Administrative statistics
- `GET /api/dashboard/upcoming-schedules` - Schedule previews

### Data Flow Pattern
```
Request → Route Handler → Controller → Model/Database → Response
    ↓           ↓            ↓           ↓              ↓
Validation → Auth Check → Business Logic → Data Query → JSON Response
```

---

## Payment & Subscription Lifecycle

### Subscription States
1. **pending_payment**: Initial state after subscription creation
2. **active**: Payment confirmed, service active
3. **suspended**: Payment overdue, service suspended
4. **cancelled**: User or admin cancellation

### Payment States
1. **pending**: Awaiting payment
2. **paid**: Payment confirmed
3. **partially_paid**: Partial payment received
4. **overdue**: Payment past due date
5. **cancelled**: Payment cancelled

### Lifecycle Transitions

```
Subscription Creation
          ↓
    pending_payment ──────┐
          │               │
          │ (payment)     │ (timeout/cancel)
          ↓               ↓
        active ────────→ cancelled
          │               ↑
          │ (non-payment) │
          ↓               │
      suspended ──────────┘
          │
          │ (payment)
          ↓
        active
```

### Critical Gaps Identified
- **Missing expiration logic**: No automatic subscription expiration
- **No suspension process**: Overdue payments don't trigger suspension
- **No reactivation flow**: Expired users cannot easily resubscribe
- **No cleanup process**: No automated handling of expired subscriptions

---

## Mobile App Integration

### React Native App Structure
```
WSBS/app/
├── resident/           # Resident interface
│   ├── HomePage.jsx    # Dashboard and overview
│   ├── AccountPage.jsx # Profile management
│   └── NotifPage.jsx   # Notifications
├── collector/          # Collector interface
│   ├── CHome.jsx       # Collector dashboard
│   ├── CSchedule.jsx   # Route management
│   └── PaymentConfirmation.jsx
├── payment/           # Payment handling
│   ├── success.jsx    # Payment success callback
│   └── failed.jsx     # Payment failure callback
└── PaymentPage.jsx    # Main payment interface
```

### Key Mobile App Data Flows

#### Resident App Flow
```
Login → Profile Loading → Dashboard Data
  ↓           ↓              ↓
JWT Token → User Profile → Subscription Status
  ↓           ↓              ↓
Auth State → Address Data → Billing Information
```

#### Collector App Flow
```
Login → Route Assignment → Collection Updates
  ↓           ↓                ↓
JWT Token → Schedule Data → Status Updates
  ↓           ↓                ↓
Auth State → Location Data → Payment Collection
```

### Deep Linking Integration
- **Success**: `wsbs://payment/success` - Payment completion
- **Failure**: `wsbs://payment/failed` - Payment failure
- **Subscription**: Automatic subscription activation on payment success

---

## Collection Management Flow

### Schedule Creation Process
```
Admin Creates Schedule
          ↓
    Route Assignment
    - Select collection route
    - Assign collection team
    - Set date and time
          ↓
    Database Storage
    - collection_schedules table
    - Link to routes and teams
          ↓
    Notification Generation
    - Resident notifications
    - Collector assignments
```

### Collection Execution Flow
```
Collector Receives Assignment
          ↓
    Route Navigation
    - GPS-based route following
    - Stop-by-stop progression
          ↓
    Status Updates
    - Collected/Missed/Rescheduled
    - Real-time status tracking
          ↓
    Payment Collection (if applicable)
    - Cash payment processing
    - Receipt generation
          ↓
    Completion Reporting
    - Route completion status
    - Summary statistics
```

### Status Tracking
- **assignment_stop_status**: Real-time collection status
- **schedule_status_history**: Historical status changes
- **collection_efficiency**: Performance metrics

---

## Admin Dashboard Data Flow

### Dashboard Statistics Generation
```
Dashboard Request
          ↓
    Multi-Query Execution
    1. Revenue statistics (paid invoices)
    2. Subscriber counts by plan
    3. Collection efficiency metrics
    4. Payment status overview
    5. Fleet utilization
    6. Resident demographics
          ↓
    Data Aggregation
    - Calculate percentages
    - Format currency values
    - Generate time-based metrics
          ↓
    JSON Response
    - Structured statistics object
    - Real-time data updates
```

### Report Generation Flow
```
Report Request
          ↓
    Parameter Validation
    - Date ranges
    - Report types
    - Output formats
          ↓
    Data Extraction
    - Complex SQL queries
    - Cross-table joins
    - Aggregation functions
          ↓
    Format Generation
    - PDF/Excel/CSV output
    - Chart generation
    - Summary statistics
          ↓
    Delivery
    - Download links
    - Email distribution
```

---

## Security & Authentication Flow

### JWT Token Management
```
User Login
          ↓
    Credential Validation
    - Username/password verification
    - Account status check
          ↓
    Token Generation
    - JWT with user claims
    - Expiration time setting
    - Role-based permissions
          ↓
    Token Storage
    - Mobile: AsyncStorage
    - Web: localStorage/sessionStorage
          ↓
    Request Authentication
    - Bearer token in headers
    - Middleware validation
    - Route protection
```

### Role-Based Access Control
- **Admin (role_id: 1)**: Full system access
- **Collector (role_id: 2)**: Collection and payment functions
- **Resident (role_id: 3)**: Subscription and billing access

### Data Protection Measures
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Sanitization and type checking
- **SQL Injection Prevention**: Parameterized queries
- **Rate Limiting**: Request throttling
- **CORS Configuration**: Cross-origin request control

---

## Critical System Issues & Recommendations

### Database Schema Issues
1. **Foreign Key Mismatches**: 
   - `customer_subscriptions.resident_id` vs application using `user_id`
   - Missing `payment_sources` table for PayMongo tracking

2. **Missing Lifecycle Columns**:
   - `payment_status` and `payment_confirmed_at` in `customer_subscriptions`
   - `next_billing_date` and `grace_period_end` for lifecycle management

### Payment Flow Issues
1. **Incomplete Activation**: PayMongo success doesn't properly activate subscriptions
2. **Missing Status Transitions**: No automated status updates based on payment dates
3. **Orphaned Data**: Payment records without proper subscription linking

### Recommended Fixes
1. **Schema Migration**: Add missing columns and tables
2. **Lifecycle Implementation**: Automated subscription state management
3. **Payment Integration**: Complete PayMongo webhook handling
4. **Data Cleanup**: Automated processes for expired subscriptions

---

## Performance Considerations

### Database Optimization
- **Indexes**: Created on frequently queried columns (invoice status, due dates, subscription status)
- **Query Optimization**: Efficient joins and aggregations in dashboard queries
- **Connection Pooling**: PostgreSQL connection pool management

### API Performance
- **Response Caching**: Static data caching for subscription plans
- **Pagination**: Large dataset pagination for invoices and schedules
- **Async Processing**: Background tasks for report generation

### Mobile App Performance
- **Data Caching**: Local storage of frequently accessed data
- **Lazy Loading**: Component-based loading for better UX
- **Offline Support**: Basic offline functionality for critical features

---

## Monitoring & Logging

### Error Tracking
- **Console Logging**: Comprehensive error logging with stack traces
- **Request Logging**: API request/response logging
- **Database Logging**: Query performance monitoring

### Business Metrics
- **Payment Success Rates**: PayMongo integration monitoring
- **Collection Efficiency**: Route completion statistics
- **User Engagement**: App usage analytics
- **Revenue Tracking**: Real-time billing metrics

---

This documentation provides a comprehensive overview of the WSBS data flow architecture. The system demonstrates a well-structured approach to waste management with clear separation of concerns between mobile, web, and backend components. However, the identified gaps in subscription lifecycle management and payment confirmation flows require immediate attention to ensure system reliability and user experience.
