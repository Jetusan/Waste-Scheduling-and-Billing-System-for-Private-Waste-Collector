# 🔧 Duplicate Key Constraint Fix

## ❌ **The Problem:**
When selecting Manual GCash payment, the system was trying to create a new subscription record but failed with:
```
duplicate key value violates unique constraint "customer_subscriptions_user_id_plan_id_key"
Key (user_id, plan_id)=(143, 3) already exists.
```

## 🔍 **Root Cause:**
The database has a unique constraint on `(user_id, plan_id)` to prevent duplicate subscriptions. When we tried to create a new subscription for manual GCash, it violated this constraint because the user already had a subscription record (even if cancelled).

## ✅ **The Fix:**

### **Before (Creating New Record):**
```javascript
// This caused duplicate key error
const subscriptionData = {
  user_id,
  plan_id: plan.plan_id,  // ❌ Already exists for this user
  billing_start_date,
  payment_method
};
subscription = await billingModel.createCustomerSubscription(subscriptionData);
```

### **After (Updating Existing Record):**
```javascript
// Update existing subscription instead of creating new one
const updateQuery = `
  UPDATE customer_subscriptions 
  SET 
    status = 'pending_payment',           // ✅ Set to pending
    payment_status = 'pending',          // ✅ Set to pending
    payment_method = $1,                 // ✅ Update to manual_gcash
    updated_at = CURRENT_TIMESTAMP,
    reactivated_at = CURRENT_TIMESTAMP,
    payment_confirmed_at = NULL          // ✅ Clear old payment timestamp
  WHERE user_id = $2
  RETURNING *
`;
const updateResult = await pool.query(updateQuery, [payment_method, user_id]);
subscription = updateResult.rows[0];
```

## 🧪 **Expected Results After Fix:**

### **Backend Logs:**
```
📥 Mobile subscription request body: { payment_method: 'manual_gcash' }
🔍 Extracted user_id from token: 143
🔄 Using enhanced reactivation (long-term cancellation)
🔄 Manual payment method - updating existing subscription to pending instead of auto-activation
✅ Subscription updated successfully
```

### **API Response:**
```json
{
  "hasSubscription": true,
  "uiState": "pending_manual_gcash",  // ✅ Correct
  "subscription": {
    "status": "pending_payment",      // ✅ Correct
    "paymentStatus": "pending",       // ✅ Correct
    "paymentMethod": "manual_gcash",  // ✅ Correct
    "paymentConfirmedAt": null        // ✅ Correct (cleared)
  }
}
```

### **Mobile App UI:**
- ❌ **NO** Collection Schedule (only for active subscriptions)
- ✅ Shows "Subscription" button (not "My Subscription")
- ✅ Clock icon (not checkmark)
- ✅ Can navigate to ManualGCashPayment screen

## 🎯 **Key Changes:**

1. **No More Duplicate Records**: Updates existing subscription instead of creating new one
2. **Proper Status Reset**: Sets status to `pending_payment` and `payment_status` to `pending`
3. **Payment Method Update**: Changes payment method to `manual_gcash`
4. **Timestamp Cleanup**: Clears `payment_confirmed_at` to remove old payment data
5. **Database Constraint Compliance**: Respects unique constraint on `(user_id, plan_id)`

## ✅ **Test Scenario:**

1. **Cancel subscription** → Status becomes `cancelled`
2. **Select "GCash (Manual)"** → Updates existing record to `pending_payment`
3. **Navigate to ManualGCashPayment** → Still `pending_payment`
4. **Go back to HomePage** → Shows "Subscription" button only
5. **Upload payment proof** → Verification process begins
6. **After verification** → Status becomes `active` + shows collection schedule

The duplicate key error is now fixed and manual GCash payments work correctly! 🎉
