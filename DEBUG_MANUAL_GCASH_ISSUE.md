# 🔍 Debug Manual GCash Issue

## ❌ **The Problem:**
When you select Manual GCash Payment → Navigate to ManualGCashPayment screen → Go back to HomePage → The collection schedule and "My Subscription" appear (but shouldn't until payment is completed).

## 🧪 **Debug Steps:**

### **Step 1: Check What API Returns**
When you go back to HomePage, check the console logs for:

```
🔄 Subscription details: { hasSubscription, subscriptionStatus, uiState }
```

**Expected for Manual GCash (before payment):**
```json
{
  "hasSubscription": true,
  "uiState": "pending_manual_gcash", 
  "subscription": {
    "status": "pending_payment",
    "paymentStatus": "pending",
    "paymentMethod": "manual_gcash"
  }
}
```

### **Step 2: Check HomePage Logic**
Look for this log:
```
🔄 Setting subscription status to [ACTIVE/PENDING/NONE]
```

**Expected:** Should log `🔄 Setting subscription status to PENDING`

### **Step 3: Check UI Rendering**
- **Collection Schedule**: Should NOT appear (only for `subscriptionStatus === 'active'`)
- **Button Text**: Should show "Subscription" (not "My Subscription")
- **Button Icon**: Should show clock icon (not checkmark)

## 🔧 **Possible Issues & Fixes:**

### **Issue 1: Backend Returns Wrong Status**
If API returns `uiState: 'active'` instead of `pending_manual_gcash`:

**Check:** Subscription creation in `createMobileSubscription`
**Fix:** Ensure `payment_method: 'manual_gcash'` creates `pending_payment` status

### **Issue 2: Frontend Misinterprets Status**
If API is correct but HomePage shows active:

**Check:** HomePage logic at lines 88-98
**Current Logic:**
```javascript
if (uiState === 'active' || subscriptionStatus === 'active') {
  setSubscriptionStatus('active');  // Shows collection schedule
} else if (uiState === 'pending_manual_gcash' || ...) {
  setSubscriptionStatus('pending');  // Should NOT show collection schedule
}
```

### **Issue 3: Collection Schedule Logic**
**Check:** Line 315 in HomePage.jsx
```javascript
{subscriptionStatus === 'active' && (  // ✅ This is correct
  <Pressable>Collection Schedule</Pressable>
)}
```

## 🧪 **Test Scenario:**

1. **Cancel existing subscription**
2. **Go to Subscription page** → Select "GCash (Manual)"
3. **Check console logs** → Should create `pending_payment` subscription
4. **Navigate to ManualGCashPayment** → Should still be `pending_payment`
5. **Go back to HomePage** → Should show:
   - ❌ **NO** Collection Schedule
   - ✅ "Subscription" button (not "My Subscription")
   - ✅ Clock icon (not checkmark)

## 🔍 **Debug Commands:**

Add these to your console to check:

```javascript
// In HomePage, add this to see exact values:
console.log('🔥 DEBUG - subscriptionStatus:', subscriptionStatus);
console.log('🔥 DEBUG - uiState from API:', data.uiState);
console.log('🔥 DEBUG - subscription.status:', data.subscription?.status);
console.log('🔥 DEBUG - subscription.paymentStatus:', data.subscription?.paymentStatus);
```

## 🎯 **Expected Flow:**

```
Select Manual GCash → 
Create pending_payment subscription →
Navigate to ManualGCashPayment →
Go back to HomePage →
API returns: pending_manual_gcash →
HomePage sets: subscriptionStatus = 'pending' →
UI shows: "Subscription" button only (NO collection schedule)
```

## ✅ **Quick Fix Test:**

If the issue persists, try this temporary fix in HomePage.jsx:

```javascript
// Temporary debug - force pending for manual_gcash
if (uiState === 'pending_manual_gcash') {
  setSubscriptionStatus('pending');
  console.log('🔧 FORCED pending for manual_gcash');
}
```

Run through the test scenario and check the console logs to identify exactly where the issue occurs!
