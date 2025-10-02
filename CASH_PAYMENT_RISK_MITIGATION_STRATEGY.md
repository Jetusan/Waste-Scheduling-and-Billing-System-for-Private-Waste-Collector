# Cash on Collection - Risk Mitigation Strategy

## 🎯 Problem Statement

**Challenge:** When collectors go to residents' houses to collect waste, there's no guarantee the resident will pay the cash subscription fee. The resident might:
- Not be home
- Refuse to pay
- Claim they already paid
- Say they'll pay next time
- Cancel their subscription

**Risk:** Subscriptions remain in `pending_payment` status indefinitely, causing:
- Revenue loss
- Service provided without payment
- Collector time wasted
- Poor accountability
    
---

## ✅ Comprehensive Solution Strategy

### **1. Multi-Layered Payment Tracking System**

#### **A. Payment Attempt Tracking**
Track every collection visit and payment attempt:

```sql
CREATE TABLE payment_attempts (
  attempt_id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES customer_subscriptions(subscription_id),
  user_id INTEGER REFERENCES users(user_id),
  collector_id INTEGER REFERENCES collectors(collector_id),
  attempt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  outcome VARCHAR(50), -- 'paid', 'not_home', 'refused', 'promised_next_time', 'no_cash'
  amount_collected DECIMAL(10,2),
  notes TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(10,8)
);
```

**Benefits:**
- Complete audit trail
- Identify problematic residents
- Track collector performance
- Evidence for disputes

#### **B. Payment Status Lifecycle**

```
pending_payment (0 days)
    ↓
first_attempt_failed (1-3 days)
    ↓
second_attempt_failed (4-7 days)
    ↓
final_warning (8-10 days)
    ↓
suspended (11+ days)
    ↓
cancelled (30+ days)
```

---

### **2. Immediate Payment Verification (During Collection)**

#### **Collector App Flow:**

```
1. Collector arrives at resident's house
   ↓
2. Collector marks "Arrived at Location" (GPS tracked)
   ↓
3. System shows:
   - Resident name
   - Subscription status
   - Amount due: ₱199
   - Payment history
   - Previous attempt outcomes
   ↓
4. Collector attempts collection:
   
   OPTION A: Resident Pays
   - Collector inputs amount
   - Takes optional photo of cash/receipt
   - Confirms payment
   - System activates subscription immediately
   - Resident gets SMS confirmation
   
   OPTION B: Resident Not Home
   - Collector marks "Not Home"
   - System schedules retry
   - Resident gets notification
   
   OPTION C: Resident Refuses/No Cash
   - Collector marks reason
   - System flags account
   - Escalation process begins
```

---

### **3. Automated Enforcement Rules**

#### **Rule 1: Three-Strike System**

```javascript
Strike 1 (First Failed Attempt):
- Send SMS: "Our collector visited but couldn't collect payment. 
  We'll try again tomorrow. Please have ₱199 ready."
- Schedule retry next day
- Status: pending_payment

Strike 2 (Second Failed Attempt):
- Send SMS: "Second attempt failed. Your service will be suspended 
  if payment isn't received within 3 days."
- Schedule final attempt in 2 days
- Status: payment_warning

Strike 3 (Third Failed Attempt):
- Suspend subscription immediately
- Send SMS: "Subscription suspended due to non-payment. 
  Contact us to reactivate."
- Stop waste collection service
- Status: suspended
```

#### **Rule 2: Grace Period with Consequences**

```javascript
Days 1-3: Active service, daily reminders
Days 4-7: Service continues, warning notifications
Days 8-10: Final warning, service at risk
Days 11+: Service suspended, no collection
Days 30+: Subscription cancelled, must resubscribe
```

#### **Rule 3: Partial Payment Handling**

```javascript
If resident pays less than ₱199:
- Record partial payment
- Calculate remaining balance
- Set new due date for balance
- Continue service if at least 50% paid
- Otherwise, suspend until full payment
```

---

### **4. Collector Protection & Incentives**

#### **A. Collector Dashboard Enhancements**

Show before visiting each stop:
```
🚨 PAYMENT ALERTS:
- ⚠️ First-time subscriber (no payment history)
- 🔴 2 failed payment attempts
- ⭐ Reliable payer (100% payment rate)
- 💰 Outstanding balance: ₱199
```

#### **B. Collection Efficiency Metrics**

```javascript
Collector Performance Tracking:
- Payment collection rate: 85%
- Average collection time: 3 minutes
- Failed attempts: 15%
- Dispute rate: 2%
```

#### **C. Incentive System**

```javascript
Bonuses for collectors:
- 95%+ collection rate: +₱500/month
- Zero disputes: +₱300/month
- Fastest collections: +₱200/month
```

---

### **5. Resident Accountability System**

#### **A. Payment History Score**

```javascript
Score Calculation:
- On-time payments: +10 points
- Late payment (1-3 days): +5 points
- Late payment (4-7 days): +2 points
- Failed attempt: -5 points
- Refused payment: -10 points
- Disputed payment: -15 points

Score Ranges:
- 90-100: Excellent (Green badge)
- 70-89: Good (Blue badge)
- 50-69: Fair (Yellow badge)
- Below 50: Poor (Red badge - requires prepayment)
```

#### **B. Consequences for Poor Payment History**

```javascript
Red Badge Residents (Score < 50):
- Must switch to GCash (prepayment only)
- OR pay 2 months upfront for cash option
- OR provide security deposit (₱500)
- More frequent collection visits
- Priority for service suspension
```

---

### **6. Alternative Payment Options (Fallback)**

#### **A. Neighbor Payment Collection**

```javascript
If resident not home:
- Collector can collect from neighbor
- Neighbor signs as witness
- Photo of payment required
- Resident gets notification
- Payment credited to account
```

#### **B. Barangay Office Payment**

```javascript
Resident can pay at:
- Barangay hall
- Authorized payment centers
- Partner stores (7-Eleven, etc.)
- Payment code system
```

#### **C. Emergency GCash Conversion**

```javascript
After 2 failed cash attempts:
- System offers GCash conversion
- Resident gets payment link via SMS
- Can pay online immediately
- Subscription activated instantly
```

---

### **7. Notification & Reminder System**

#### **Before Collection Day:**

```
Day -1: "Reminder: Waste collection tomorrow. 
        Please prepare ₱199 cash payment."

Day 0 (Morning): "Collector will arrive between 8-11 AM. 
                  Please be available with payment."

Day 0 (1 hour before): "Collector is on the way to your area. 
                        Have ₱199 ready."
```

#### **After Failed Attempt:**

```
Immediately: "Our collector visited but you weren't available. 
              Next attempt: Tomorrow at 9 AM."

Day +1: "Second collection attempt today. 
         Please be home with ₱199 payment."

Day +3: "FINAL NOTICE: Service will be suspended tomorrow 
         if payment not received."
```

---

### **8. Dispute Resolution Process**

#### **Resident Claims They Paid:**

```javascript
Verification Process:
1. Check payment_attempts table
2. Review collector's notes and photos
3. Check GPS location data
4. Contact collector for confirmation
5. If no proof, request receipt from resident
6. If still disputed, escalate to admin

Resolution:
- If resident correct: Activate subscription, warn collector
- If collector correct: Maintain suspension, warn resident
- If unclear: Split difference, both get warnings
```

---

### **9. Database Schema Enhancements**

```sql
-- Add to customer_subscriptions table
ALTER TABLE customer_subscriptions ADD COLUMN IF NOT EXISTS
  payment_attempts_count INTEGER DEFAULT 0,
  last_payment_attempt_date DATE,
  payment_score INTEGER DEFAULT 100,
  requires_prepayment BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,
  suspended_at TIMESTAMP;

-- Add to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  payment_reliability_score INTEGER DEFAULT 100,
  total_payments_made INTEGER DEFAULT 0,
  total_payments_failed INTEGER DEFAULT 0,
  last_payment_date DATE;
```

---

### **10. Implementation Priorities**

#### **Phase 1: Immediate (Week 1)**
✅ Payment attempt tracking
✅ Three-strike system
✅ Basic SMS notifications
✅ Collector UI enhancements

#### **Phase 2: Short-term (Week 2-3)**
- Payment history scoring
- Automated suspension logic
- Dispute resolution system
- Collector performance tracking

#### **Phase 3: Medium-term (Month 2)**
- Advanced analytics
- Incentive system
- Alternative payment options
- Barangay office integration

#### **Phase 4: Long-term (Month 3+)**
- Machine learning for payment prediction
- Dynamic pricing based on reliability
- Community payment programs
- Gamification for on-time payments

---

## 📊 Expected Outcomes

### **Before Implementation:**
- Payment collection rate: ~60%
- Average collection time: Unknown
- Suspended accounts: High
- Collector disputes: Frequent
- Revenue loss: Significant

### **After Implementation:**
- Payment collection rate: **85-90%**
- Average collection time: **3-5 minutes**
- Suspended accounts: **Reduced by 70%**
- Collector disputes: **Reduced by 80%**
- Revenue loss: **Reduced by 75%**

---

## 🎯 Key Success Factors

1. **Clear Communication:** Residents know exactly when collector arrives and what's expected
2. **Accountability:** Both collectors and residents tracked with evidence
3. **Fair Enforcement:** Automated rules apply equally to everyone
4. **Multiple Chances:** Three attempts before suspension
5. **Alternative Options:** GCash, barangay office, neighbor collection
6. **Incentives:** Rewards for good payment behavior
7. **Consequences:** Clear penalties for non-payment
8. **Transparency:** All payment attempts logged and visible

---

## 🚀 Next Steps

1. **Implement payment_attempts table**
2. **Add payment tracking to collector app**
3. **Create automated suspension cron job**
4. **Set up SMS notification system**
5. **Build admin dashboard for monitoring**
6. **Train collectors on new process**
7. **Communicate changes to residents**
8. **Monitor and adjust rules based on data**

---

**Document Created:** 2025-10-01  
**System:** WSBS (Waste Scheduling and Billing System)  
**Focus:** Cash on Collection Risk Mitigation
