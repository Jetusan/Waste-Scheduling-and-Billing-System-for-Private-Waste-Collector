# Payment Failed Flow - How It Works

## 🎯 New Improved Flow

### **What Happens When You Click "Payment Failed":**

```
1. Collector clicks "Payment Failed" button
   ↓
2. System shows 4 options:
   • Resident Not Home
   • Resident Has No Cash
   • Resident Refused to Pay
   • Promised to Pay Next Time
   ↓
3. Collector selects reason
   ↓
4. System does THREE things automatically:
   ✅ Records payment failure in database
   ✅ Marks collection as "MISSED" 
   ✅ Hides stop from list (disappears!)
   ↓
5. Shows confirmation message:
   "Payment failed: [reason]
    Collection marked as missed.
    Retry scheduled for tomorrow."
```

---

## ✅ You DON'T Need to Click "Missed" Separately!

**Old confusing flow:**
```
❌ Click "Payment Failed" → Still visible → Click "Missed" → Disappears
```

**New automatic flow:**
```
✅ Click "Payment Failed" → Auto-marks as missed → Disappears immediately!
```

---

## 🔄 Complete Scenarios

### **Scenario 1: Successful Payment**
```
1. Resident pays ₱199
2. Collector inputs amount
3. Clicks "Confirm Cash"
4. ✅ Payment recorded
5. ✅ Subscription activated
6. ✅ Stop disappears (filtered out as collected)
```

### **Scenario 2: Payment Failed - Resident Not Home**
```
1. Collector arrives, no one home
2. Clicks "Payment Failed"
3. Selects "Resident Not Home"
4. ✅ Payment failure recorded
5. ✅ Automatically marked as "Missed"
6. ✅ Stop disappears immediately
7. ✅ Retry scheduled for tomorrow
8. ✅ Resident gets notification
```

### **Scenario 3: Payment Failed - Resident Refused**
```
1. Collector arrives, resident refuses
2. Clicks "Payment Failed"
3. Selects "Resident Refused to Pay"
4. ✅ Payment failure recorded (-15 points)
5. ✅ Automatically marked as "Missed"
6. ✅ Stop disappears immediately
7. ✅ After 3 refusals → Auto-suspended
8. ⚠️ Warning shown if 2+ attempts
```

### **Scenario 4: Waste Collected But No Payment**
```
Option A: Collect waste anyway (goodwill)
1. Click "Collected" (waste picked up)
2. Click "Payment Failed" → Select reason
3. ✅ Waste collected, payment tracked separately

Option B: Don't collect without payment
1. Click "Payment Failed" → Select reason
2. ✅ Auto-marks as missed
3. ✅ No waste collection
4. ✅ Retry tomorrow
```

---

## 🎨 UI Flow

### **Before Clicking Payment Failed:**
```
┌─────────────────────────────────────┐
│ Stop #5 - John Doe                  │
│ 📍 123 Main St                      │
│ ⏳ Pending Payment                   │
│                                     │
│ Payment Method: Cash on Collection  │
│ [Amount: ₱199] [Confirm Cash]       │
│                                     │
│ ┌─────────────────────────────┐    │
│ │   Payment Failed            │    │
│ └─────────────────────────────┘    │
│                                     │
│ [Collected]  [Missed]               │
└─────────────────────────────────────┘
```

### **After Clicking Payment Failed:**
```
Alert shows:
┌─────────────────────────────────────┐
│ Payment Collection Failed           │
│                                     │
│ Why couldn't you collect payment?   │
│                                     │
│ • Resident Not Home                 │
│ • Resident Has No Cash              │
│ • Resident Refused to Pay           │
│ • Promised to Pay Next Time         │
│ • Cancel                            │
└─────────────────────────────────────┘
```

### **After Selecting Reason:**
```
Alert shows:
┌─────────────────────────────────────┐
│ Payment Failed                      │
│                                     │
│ Payment failed: resident not home   │
│ Collection marked as missed.        │
│ Retry scheduled for tomorrow.       │
│                                     │
│ [OK]                                │
└─────────────────────────────────────┘

Stop disappears from list! ✅
```

---

## 📊 What Gets Recorded

### **In Database:**

**1. payment_attempts table:**
```javascript
{
  subscription_id: 123,
  user_id: 140,
  collector_id: 29,
  outcome: 'not_home',  // The reason selected
  amount_collected: 0,
  amount_expected: 199,
  notes: 'Payment attempt failed: not_home',
  retry_scheduled_date: '2025-10-02',
  attempt_date: '2025-10-01'
}
```

**2. assignment_stop_status table:**
```javascript
{
  schedule_id: 5,
  user_id: 140,
  latest_action: 'missed',  // Automatically set!
  updated_at: '2025-10-01 08:30:00'
}
```

**3. customer_subscriptions table:**
```javascript
{
  payment_attempts_count: 1,  // Incremented
  payment_score: 95,  // Decreased from 100
  last_payment_attempt_date: '2025-10-01',
  last_payment_attempt_outcome: 'not_home'
}
```

---

## 🎯 Benefits of This Flow

### **For Collectors:**
✅ **Simpler** - One button does everything
✅ **Faster** - No need to click "Missed" separately
✅ **Less confusion** - Clear what happens
✅ **Automatic** - Stop disappears immediately

### **For System:**
✅ **Complete tracking** - Both payment AND collection status recorded
✅ **Accurate data** - Payment failure = missed collection
✅ **Automatic retry** - Scheduled for next day
✅ **Proper scoring** - Payment reliability tracked

### **For Residents:**
✅ **Fair treatment** - Reason recorded
✅ **Automatic retry** - Another chance tomorrow
✅ **Clear communication** - Gets notification
✅ **Score tracking** - Payment history maintained

---

## 🔄 Dynamic Behavior

### **Filtering Logic:**
```javascript
// Stop is hidden if:
1. latest_action === 'collected' ✅
2. latest_action === 'missed' ✅ (from payment failed)
3. No subscription info
4. Subscription not active/pending

// Stop is shown if:
1. Has active or pending subscription
2. NOT yet collected
3. NOT yet missed
```

### **After Payment Failed:**
```javascript
// Immediately updates local state:
setStops(prev => prev.map(s => 
  s.user_id === stop.user_id 
    ? { ...s, latest_action: 'missed' }  // Marks as missed
    : s
));

// Filter removes it:
.filter(stop => stop.latest_action !== 'missed')  // Hidden!
```

---

## ❓ Common Questions

### **Q: Do I need to click "Missed" after "Payment Failed"?**
**A:** No! It's automatic. "Payment Failed" marks it as missed and hides it.

### **Q: What if I collect waste but payment fails?**
**A:** Two options:
1. Click "Collected" first (waste picked up), then "Payment Failed" (tracks both)
2. Click "Payment Failed" only (no waste collection, marked as missed)

### **Q: Can I see the stop again after payment fails?**
**A:** No, it disappears. It will show up again tomorrow for retry.

### **Q: What if resident pays next time?**
**A:** The stop appears in tomorrow's route. Collector can then click "Confirm Cash".

### **Q: Does the stop disappear immediately?**
**A:** Yes! As soon as you select the payment failure reason.

---

## 🎉 Summary

**One Button Does It All:**
- ✅ Records payment failure
- ✅ Marks as missed
- ✅ Schedules retry
- ✅ Updates scores
- ✅ Hides stop
- ✅ Sends notifications

**No need to click "Missed" separately!**

---

**Updated:** 2025-10-01  
**Feature:** Automatic Payment Failed Flow  
**Status:** ✅ Implemented and Working
