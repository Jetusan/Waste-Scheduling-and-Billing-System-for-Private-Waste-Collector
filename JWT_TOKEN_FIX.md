# 🔧 JWT Token Field Name Fix

## ❌ **The Problem:**
Manual GCash payment was failing with "User authentication failed" error due to JWT token field name mismatch.

## 🔍 **Root Cause:**
The JWT token uses `userId` (camelCase) but the code was looking for `user_id` (snake_case):

**JWT Token Structure:**
```json
{
  "userId": 143,        // ✅ This exists
  "username": "brent123",
  "iat": 1761228473,
  "exp": 1761314873
}
```

**Code was looking for:**
```javascript
const user_id = req.user.user_id;  // ❌ undefined
```

## ✅ **The Fix:**
Updated all instances to handle both naming conventions:

```javascript
// BEFORE
const user_id = req.user.user_id;

// AFTER  
const user_id = req.user?.user_id || req.user?.userId;
```

## 📁 **Files Updated:**
- `backend/routes/manualPayments.js` - 3 instances fixed:
  1. Main submission endpoint
  2. Status check endpoint  
  3. Admin verification endpoint

## 🎯 **Result:**
Manual GCash payment submissions will now work correctly by extracting the user ID from either field name format.

## 🧪 **Test:**
Try submitting the manual GCash payment again - it should now properly authenticate and process the submission! 🚀
