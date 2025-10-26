# 📋 Complete Subscription Flow Testing Checklist

## 🚀 How to Test

### **Backend Automated Test:**
1. Make sure your backend server is running (`npm start` in backend folder)
2. Run the test script: `test_subscription_flow.bat`
3. Check console output for results

### **Frontend Manual Test:**
Follow these steps in your mobile app/browser

---

## 💰 **CASH PAYMENT FLOW TEST**

### **Step 1: User Subscription**
- [ ] Open mobile app
- [ ] Navigate to subscription page
- [ ] Select "Cash on Collection" payment method
- [ ] Complete subscription form
- [ ] **Expected**: Subscription created with "pending_payment" status

### **Step 2: Collector Collection**
- [ ] Open collector app/interface
- [ ] Navigate to "Payment Confirmation" or collection screen
- [ ] Find the test subscription in pending list
- [ ] Enter payment amount (₱199)
- [ ] Confirm cash payment
- [ ] **Expected**: Success message + subscription activated

### **Step 3: Receipt Verification**
- [ ] Go back to resident app
- [ ] Navigate to "My Subscription" or "Subscription Status"
- [ ] Look for "📄 View Payment Receipt" button
- [ ] Click the receipt button
- [ ] **Expected**: Receipt page opens with payment details

### **Step 4: Receipt Content Check**
- [ ] Verify receipt shows:
  - [ ] Receipt number (RCP-YYYYMMDD-XXXXXX)
  - [ ] Payment amount (₱199.00)
  - [ ] Payment method (Cash on Collection)
  - [ ] Payment date and time
  - [ ] Collector information
  - [ ] "PAID" status badge
- [ ] Click "Back to Dashboard" button
- [ ] **Expected**: Returns to dashboard/homepage

---

## 📱 **GCASH PAYMENT FLOW TEST**

### **Step 1: User Subscription**
- [ ] Open mobile app
- [ ] Navigate to subscription page
- [ ] Select "Manual GCash" payment method
- [ ] Complete subscription form
- [ ] **Expected**: Subscription created, redirected to upload receipt page

### **Step 2: GCash Receipt Upload**
- [ ] Take a clear screenshot of a GCash payment receipt
- [ ] In upload page, enter GCash reference number
- [ ] Upload the receipt image (camera or gallery)
- [ ] Submit the receipt
- [ ] **Expected**: Processing message appears

### **Step 3: OCR Verification Result**
**If OCR verification succeeds:**
- [ ] Alert shows "Payment Verified! ✅"
- [ ] Options: "View Receipt" and "Go to Dashboard"
- [ ] Click "View Receipt"
- [ ] **Expected**: Receipt page opens immediately

**If OCR verification fails:**
- [ ] Alert shows "Verification failed"
- [ ] Suggestion to retry with clearer image
- [ ] **Expected**: Can retry upload

### **Step 4: Receipt Verification (Success Case)**
- [ ] Receipt page displays with:
  - [ ] Receipt number
  - [ ] Payment amount (₱199.00)
  - [ ] Payment method (Manual GCash)
  - [ ] GCash reference number
  - [ ] Payment date and time
  - [ ] "PAID" status badge
- [ ] Click "Back to Dashboard"
- [ ] **Expected**: Returns to homepage

---

## 🔍 **ADDITIONAL VERIFICATION TESTS**

### **Database Verification:**
- [ ] Check `customer_subscriptions` table - status should be 'active'
- [ ] Check `invoices` table - status should be 'paid'
- [ ] Check `payments` table - payment record exists
- [ ] Check `receipts` table - receipt record exists

### **API Endpoint Tests:**
- [ ] Test `/api/billing/confirm-cash-payment` endpoint
- [ ] Test `/api/billing/upload-gcash-receipt` endpoint
- [ ] Test `/api/receipt/user/{user_id}` endpoint
- [ ] Test receipt generation endpoints

### **Error Handling Tests:**
- [ ] Test with invalid payment amounts
- [ ] Test with missing required fields
- [ ] Test with non-existent subscription IDs
- [ ] Test with corrupted receipt images

---

## 📊 **SUCCESS CRITERIA**

### **✅ Cash Flow Success:**
1. Subscription created → Invoice generated → Cash collected → Receipt generated → Subscription activated
2. Receipt accessible via "My Subscription" page
3. Receipt contains all required information
4. Back button returns to dashboard

### **✅ GCash Flow Success:**
1. Subscription created → Invoice generated → Receipt uploaded → OCR verified → Receipt generated → Subscription activated
2. Immediate receipt display after successful verification
3. Receipt contains all required information
4. Back button returns to dashboard

### **✅ Overall System Success:**
- No database errors
- All API endpoints responding correctly
- Mobile app navigation working smoothly
- Professional receipt display
- Complete audit trail in database

---

## 🐛 **Common Issues to Check**

### **Backend Issues:**
- [ ] Database connection errors
- [ ] Missing environment variables
- [ ] OCR dependencies not installed
- [ ] API endpoint routing errors

### **Frontend Issues:**
- [ ] Navigation routing problems
- [ ] API call failures
- [ ] Image upload issues
- [ ] Receipt display formatting

### **Integration Issues:**
- [ ] Receipt generation timing
- [ ] OCR verification accuracy
- [ ] Payment confirmation delays
- [ ] Status synchronization

---

## 🎯 **Test Results Template**

```
CASH PAYMENT FLOW: ✅ PASS / ❌ FAIL
- Subscription creation: ✅ / ❌
- Cash collection: ✅ / ❌
- Receipt generation: ✅ / ❌
- Receipt display: ✅ / ❌
- Navigation: ✅ / ❌

GCASH PAYMENT FLOW: ✅ PASS / ❌ FAIL
- Subscription creation: ✅ / ❌
- Receipt upload: ✅ / ❌
- OCR verification: ✅ / ❌
- Receipt generation: ✅ / ❌
- Receipt display: ✅ / ❌
- Navigation: ✅ / ❌

OVERALL SYSTEM: ✅ PASS / ❌ FAIL
```

---

## 🚀 **Ready to Test!**

1. **Run Backend Test**: Execute `test_subscription_flow.bat`
2. **Run Frontend Test**: Follow the manual checklist above
3. **Verify Results**: Check both automated and manual test results
4. **Report Issues**: Note any failures for debugging

**Good luck testing! 🎯**
