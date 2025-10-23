# Manual GCash Payment Setup Guide

## ✅ What We've Added:

### 1. **Payment Method Option**
- Added "GCash (Manual)" to payment methods in `Subscription.jsx`
- Users now see 3 options:
  - GCash (Auto) - Automated PayMongo
  - **GCash (Manual)** - Upload receipt verification
  - Cash on Collection - Pay collector

### 2. **Mobile App Integration**
- Updated `PaymentPage.jsx` to handle manual GCash selection
- Navigates to `/ManualGCashPayment` when selected
- Passes subscription and amount data

### 3. **Backend Support**
- Added manual payments API route: `/api/manual-payments`
- Updated billing controller to handle `manual_gcash` payment method
- Added automatic OCR verification system

### 4. **Database Requirements**
You need to run this SQL to create the verification table:

```sql
-- Run this in your PostgreSQL database
CREATE TABLE IF NOT EXISTS manual_payment_verifications (
    verification_id SERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES customer_subscriptions(subscription_id),
    user_id INTEGER REFERENCES users(user_id),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'manual_gcash',
    amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100),
    payment_proof_url VARCHAR(500),
    gcash_number VARCHAR(20),
    payment_date TIMESTAMP DEFAULT NOW(),
    verification_status VARCHAR(30) DEFAULT 'pending',
    verified_by INTEGER REFERENCES users(user_id),
    verified_at TIMESTAMP,
    rejection_reason TEXT,
    notes TEXT,
    ocr_confidence DECIMAL(5,2) DEFAULT 0,
    ocr_report TEXT,
    ocr_extracted_data JSONB,
    auto_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE customer_subscriptions 
ADD COLUMN IF NOT EXISTS manual_payment_status VARCHAR(20) DEFAULT NULL;
```

### 5. **Install OCR Dependencies**
```bash
cd backend
npm install tesseract.js sharp
```

## 🔧 How It Works:

### **User Flow:**
1. User selects "GCash (Manual)" payment method
2. System creates subscription with `manual_gcash` payment method
3. User navigates to ManualGCashPayment screen
4. User sees your GCash details: **09916771885**
5. User sends payment via GCash app
6. User uploads screenshot of receipt
7. **System automatically verifies:**
   - ✅ Payment sent to correct number (09916771885)
   - ✅ Amount ≥ ₱199 (minimum required)
   - ✅ Has valid reference number
8. **Auto-decision:**
   - High confidence (≥90%) → **Auto-approve**
   - Medium confidence (70-89%) → **Manual review**
   - Low confidence (<70%) → **Auto-reject**

### **Validation Rules:**
- **CRITICAL**: Must be sent to `09916771885`
- **CRITICAL**: Must be ≥ ₱199 (full plan minimum)
- **REQUIRED**: Must have GCash reference number
- **OPTIONAL**: Transaction date and clear screenshot

## 🚀 Testing:

1. **Start the app**: `npx expo start`
2. **Go to Subscription page**
3. **Select "GCash (Manual)"** - you should now see it!
4. **Test the flow** with a real GCash screenshot

## 📱 Environment Variables:

Make sure these are set in your Render environment:
```
GCASH_NUMBER=09916771885
GCASH_ACCOUNT_NAME=Jytt Dela Pena
GCASH_MERCHANT_NAME=WSBS- Waste Management
```

## ✅ Ready to Use!

The Manual GCash Payment option should now appear in your payment methods. Users can select it and upload their payment receipts for automatic verification!
