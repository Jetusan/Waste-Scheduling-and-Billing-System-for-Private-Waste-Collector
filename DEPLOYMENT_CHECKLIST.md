# 🚀 WSBS Deployment Checklist

## 📋 **Pre-Deployment Checklist**

### **🔧 Backend (Render) - CRITICAL**
- [ ] **Environment Variables Set in Render:**
  - [ ] `DB_HOST=ep-summer-scene-a1rlu78r-pooler.ap-southeast-1.aws.neon.tech`
  - [ ] `DB_PORT=5432`
  - [ ] `DB_NAME=neondb`
  - [ ] `DB_USER=neondb_owner`
  - [ ] `DB_PASSWORD=npg_DZf0c3qxWQim`
  - [ ] `NODE_ENV=production`
  - [ ] `JWT_SECRET=cdcd920ab44b9aa84184c397f204c79ee1a9f6584d0f058c9275c61bc6d8acf9aa981f60b852ad30a18a4e4d2937b5c57c327bc95cccf524bc1f7892ca6e1f68`
  - [ ] `PUBLIC_URL=https://waste-scheduling-and-billing-system-for.onrender.com`
  - [ ] `BREVO_SMTP_USER=956d39001@smtp-brevo.com`
  - [ ] `BREVO_SMTP_KEY=rDkyQGwCxUvONgMF`
  - [ ] `BREVO_SENDER_EMAIL=2022_cete_delapenaj@online.htcgsc.edu.ph`
  - [ ] **`PAYMONGO_SECRET_KEY=sk_live_...` (GET FROM PAYMONGO)**
  - [ ] **`PAYMONGO_PUBLIC_KEY=pk_live_...` (GET FROM PAYMONGO)**
  - [ ] **`PAYMONGO_WEBHOOK_SECRET=whsec_...` (GET FROM PAYMONGO)**
  - [ ] `PAYMONGO_MODE=live`

### **📧 Email Service**
- [ ] **Test email verification:** `node test_production_email.js`
- [ ] **Verify Render logs show:** "EMAIL VERIFICATION SUCCESS"
- [ ] **Test actual email delivery**
- [ ] **Verify verification links work**

### **💳 PayMongo Configuration**
- [ ] **Get PayMongo live credentials** from dashboard
- [ ] **Set up webhook endpoint:** `https://your-backend.onrender.com/api/webhooks/paymongo`
- [ ] **Test GCash payment flow**
- [ ] **Verify payment confirmations work**

### **🎨 Admin Dashboard**
- [ ] **Create `.env` file:**
  ```bash
  REACT_APP_API_URL=https://waste-scheduling-and-billing-system-for.onrender.com
  REACT_APP_ENVIRONMENT=production
  ```
- [ ] **Build for production:** `npm run build`
- [ ] **Deploy to hosting service** (Netlify/Vercel)
- [ ] **Test admin login and functionality**

### **📱 Mobile App**
- [ ] **Set production flag:** `EXPO_PUBLIC_FORCE_PRODUCTION=true`
- [ ] **Build APK:** `EXPO_PUBLIC_FORCE_PRODUCTION=true expo build:android`
- [ ] **Test deep linking:** `wsbs://payment/success`
- [ ] **Test payment flow end-to-end**
- [ ] **Verify email verification works**

## 🧪 **Testing Checklist**

### **Backend API Tests**
- [ ] **Health check:** `GET https://your-backend.onrender.com/health`
- [ ] **Email config:** `node test_production_email.js`
- [ ] **Database connection:** Check Render logs for "Database connected"
- [ ] **PayMongo integration:** Test payment creation

### **Email Verification Flow**
1. [ ] **Register new user** in mobile app
2. [ ] **Check Render logs** for "EMAIL VERIFICATION PROCESS START"
3. [ ] **Receive email** with verification link
4. [ ] **Click verification link** - should show success page
5. [ ] **Check Render logs** for "EMAIL VERIFICATION SUCCESS"
6. [ ] **Continue registration** in mobile app

### **GCash Payment Flow**
1. [ ] **Create subscription** in mobile app
2. [ ] **Select GCash payment**
3. [ ] **Complete GCash payment** in browser/app
4. [ ] **Verify webhook received** in Render logs
5. [ ] **Check subscription activated**
6. [ ] **Verify invoice marked as paid**

### **Admin Dashboard**
- [ ] **Login works** with admin credentials
- [ ] **Dashboard loads** with real data
- [ ] **All sections accessible** (Users, Billing, Reports)
- [ ] **API calls successful** to backend

## 🔍 **Monitoring Setup**

### **Render Logs Monitoring**
- [ ] **Email verification logs** show success/failure
- [ ] **PayMongo webhook logs** show payment events
- [ ] **Database connection logs** show no errors
- [ ] **API request logs** show response times

### **Error Tracking**
- [ ] **Set up error monitoring** (Sentry/LogRocket)
- [ ] **Monitor payment failures**
- [ ] **Track email delivery issues**
- [ ] **Monitor API response times**

## 🚨 **Critical Issues to Watch**

### **PayMongo Integration**
- [ ] **Webhook endpoint accessible**
- [ ] **Signature verification working**
- [ ] **Payment status updates correctly**
- [ ] **Subscription activation works**

### **Email Verification**
- [ ] **Database updates** after email verification
- [ ] **Admin can see** verified registrations
- [ ] **No orphaned** temporary tokens

### **Mobile App**
- [ ] **Correct API URL** (production, not localhost)
- [ ] **Deep linking** works for payment returns
- [ ] **Push notifications** (if implemented)

## 📊 **Success Metrics**

### **Deployment Success Indicators**
- ✅ **Backend responds** to health checks
- ✅ **Email verification** works end-to-end
- ✅ **GCash payments** complete successfully
- ✅ **Admin dashboard** loads and functions
- ✅ **Mobile app** connects to production backend
- ✅ **Database operations** work correctly
- ✅ **No critical errors** in logs

### **User Experience Metrics**
- ✅ **Registration completion rate** > 80%
- ✅ **Payment success rate** > 95%
- ✅ **Email delivery rate** > 98%
- ✅ **App crash rate** < 1%

## 🔧 **Rollback Plan**

### **If Deployment Fails:**
1. **Revert to previous version** in Render
2. **Check environment variables** are correct
3. **Verify database connectivity**
4. **Test with staging environment**

### **If PayMongo Issues:**
1. **Switch to test mode** temporarily
2. **Verify webhook configuration**
3. **Check PayMongo dashboard** for errors
4. **Contact PayMongo support** if needed

## 📞 **Emergency Contacts**

### **Service Providers:**
- **Render Support:** [Render Dashboard](https://dashboard.render.com)
- **PayMongo Support:** [PayMongo Dashboard](https://dashboard.paymongo.com)
- **Neon Database:** [Neon Console](https://console.neon.tech)
- **Brevo Email:** [Brevo Dashboard](https://app.brevo.com)

### **Deployment Commands:**

```bash
# Backend deployment (auto-deploys from GitHub)
git add .
git commit -m "🚀 Production deployment"
git push origin main

# Admin dashboard build
cd admin
npm run build

# Mobile app production build
cd WSBS
EXPO_PUBLIC_FORCE_PRODUCTION=true expo build:android
```

## ✅ **Final Deployment Sign-off**

- [ ] **All tests passed**
- [ ] **All environment variables set**
- [ ] **PayMongo configured correctly**
- [ ] **Email service working**
- [ ] **Mobile app built and tested**
- [ ] **Admin dashboard deployed**
- [ ] **Monitoring setup complete**
- [ ] **Rollback plan ready**

**Deployment Date:** ___________
**Deployed By:** ___________
**Version:** ___________

🎉 **WSBS is ready for production!**
