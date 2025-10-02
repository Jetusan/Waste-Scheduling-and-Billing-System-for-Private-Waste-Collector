# Waste Management System# WSBS Deployment Guide

## PayMongo Payment Setup & Configuration

### PayMongo Test vs Production

Your system supports both test and production PayMongo modes:

**Test Mode (Development/Staging):**
- Use test API keys: `pk_test_...` and `sk_test_...`
- Payments are simulated - no real money is charged
- Perfect for development and testing

**Production Mode (Live):**
- Use live API keys: `pk_live_...` and `sk_live_...`
- Real payments are processed
- Only use when ready for live transactions

### Getting PayMongo Credentials

1. **Sign up/Login to PayMongo Dashboard:** https://dashboard.paymongo.com
2. **Get Test Keys (for development):**
   - Go to Developers → API Keys
   - Copy your test keys:
     - `pk_test_...` (Public Key)
     - `sk_test_...` (Secret Key)
3. **Set up Webhooks:**
   - Go to Developers → Webhooks
   - Create webhook pointing to your backend:
     - URL: `https://your-backend.onrender.com/api/billing/webhooks/paymongo`
     - Events: `payment.paid`, `payment.failed`
   - Copy the webhook secret: `whsec_...`

### Environment Configuration

**Local Development (.env file):**
```env
PAYMONGO_SECRET_KEY=sk_test_your_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_key_here
PAYMONGO_WEBHOOK_SECRET=whsec_your_webhook_secret
PAYMONGO_MODE=test
PUBLIC_URL=https://your-ngrok-url.ngrok-free.app
```

**Render Production (Environment Variables):**
```
PAYMONGO_SECRET_KEY=sk_test_your_key_here (or sk_live_ for production)
PAYMONGO_PUBLIC_KEY=pk_test_your_key_here (or pk_live_ for production)
PAYMONGO_WEBHOOK_SECRET=whsec_your_webhook_secret
PAYMONGO_MODE=test (or "live" for production)
PUBLIC_URL=https://wsbs-backend.onrender.com (auto-set by render.yaml)
```

### Payment Flow

1. **User initiates payment** → Frontend calls `/api/billing/create-payment`
2. **Backend creates PayMongo payment** → Returns checkout URL
3. **User completes payment** → PayMongo redirects to success/failure URL
4. **PayMongo sends webhook** → Backend processes payment confirmation
5. **Subscription activated** → User gets access

### Testing Payments

**Test Card Numbers (PayMongo Test Mode):**
- **Success:** `4343434343434345`
- **Declined:** `4000000000000002`
- **Insufficient Funds:** `4000000000009995`
- Use any future expiry date and any 3-digit CVC

**Test Payment Flow:**
1. Set `PAYMONGO_MODE=test`
2. Use test API keys
3. Create subscription in your app
4. Use test card numbers above
5. Verify webhook receives payment confirmation

---

## 📁 Project Structure

```
WASTE/
{{ ... }}
├── admin/                   # React Admin Panel
├── backend/                 # Node.js Backend Server
└── docs/                   # Documentation
```

## 🚀 Quick Start Guide

### 1. Backend Server (Node.js)
```bash
cd backend
npm install
node server.js
```
- **Port**: 5000
- **Database**: PostgreSQL (waste_collection_db)
- **Admin Login**: Use `/api/admin/login` endpoint

### 2. Mobile App (React Native/Expo)
```bash
cd WSBS
npm install
npx expo start
```
- **Development**: Use Expo Go app on mobile
- **Network**: Update `LOCAL_IP` in `config.js` for your network

### 3. Admin Panel (React)
```bash
cd admin
npm install
npm start
```
- **Port**: 3000
- **Access**: http://localhost:3000
- **Login**: Admin credentials from backend

## 🔧 Configuration Files

### Backend Configuration
- **Database**: `backend/config/db.js`
- **Environment**: `backend/.env` (create if missing)
- **Routes**: `backend/app.js`

### Mobile App Configuration
- **API URLs**: `WSBS/app/config.js`
- **Update LOCAL_IP**: Change to your computer's IP address

### Admin Panel Configuration
- **API URLs**: Update in component files (currently localhost:5000)

## 📊 Database Setup

### Required Tables for Chat Feature
Run this SQL in your PostgreSQL database:

```sql
-- Chat tables
CREATE TABLE IF NOT EXISTS special_pickup_chats (
    chat_id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES special_pickup_requests(request_id),
    status VARCHAR(20) DEFAULT 'active',
    price_agreed BOOLEAN DEFAULT FALSE,
    final_agreed_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS special_pickup_chat_messages (
    message_id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES special_pickup_chats(chat_id),
    sender_type VARCHAR(20) NOT NULL,
    sender_id INTEGER NOT NULL,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    price_amount DECIMAL(10,2),
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🌐 Network Configuration

### For Mobile Development
1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` (look for inet)

2. Update `WSBS/app/config.js`:
   ```javascript
   export const LOCAL_IP = 'YOUR_IP_ADDRESS_HERE';
   ```

3. Ensure all devices are on the same network

## 🔑 Authentication Flow

### Mobile App
- **Login**: `POST /api/auth/login`
- **Token Storage**: SecureStore (auth.js)
- **User Types**: resident, collector

### Admin Panel
- **Login**: `POST /api/admin/login`
- **Token Storage**: sessionStorage
- **Access**: Admin dashboard at `/admin`

## 📱 Features Overview

### Mobile App Features
- ✅ User Registration/Login
- ✅ Special Pickup Requests (with date/time picker)
- ✅ Chat with Admin/Collectors
- ✅ Payment Integration (PayMongo)
- ✅ Collection Schedules
- ✅ Profile Management

### Admin Panel Features
- ✅ Dashboard with Statistics
- ✅ Special Pickup Management
- ✅ Chat System with Residents
- ✅ User Management
- ✅ Billing Management
- ✅ Collection Schedule Management
- ✅ Reports and Analytics

## 🐛 Common Issues & Solutions

### 1. Chat Messages Not Sending
**Problem**: Database tables missing
**Solution**: Run the chat table creation SQL above

### 2. Network Request Failed
**Problem**: Backend server not running or wrong IP
**Solution**: 
- Start backend: `cd backend && node server.js`
- Update LOCAL_IP in mobile config

### 3. Admin Chat Page Not Visible
**Problem**: Route not configured
**Solution**: ✅ Fixed - Added to Operations menu

### 4. Date Picker Errors
**Problem**: Date objects undefined
**Solution**: ✅ Fixed - Added null checks and fallbacks

## 📂 File Locations

### Key Configuration Files
- **Mobile API Config**: `WSBS/app/config.js`
- **Backend Routes**: `backend/app.js`
- **Admin Routes**: `admin/src/App.jsx`
- **Database Config**: `backend/config/db.js`

### Chat System Files
- **Backend Controller**: `backend/controller/chatController.js`
- **Backend Routes**: `backend/routes/chat.js`
- **Mobile Component**: `WSBS/app/components/RequestChatSection.jsx`
- **Admin Component**: `admin/src/components/SpecialPickupChat.jsx`

## 🚀 Production Deployment

### Backend (Node.js)
- Use PM2 or similar process manager
- Set up environment variables
- Configure reverse proxy (nginx)

### Admin Panel (React)
- Build: `npm run build`
- Deploy to web server (nginx, Apache)
- Update API URLs for production

### Mobile App (React Native)
- Build APK: `expo build:android`
- Build IPA: `expo build:ios`
- Update API URLs for production server

## 📞 Support

For issues or questions:
1. Check this guide first
2. Verify all services are running
3. Check network configuration
4. Review console logs for errors

---

**Last Updated**: September 2025
**Version**: 1.0.0
