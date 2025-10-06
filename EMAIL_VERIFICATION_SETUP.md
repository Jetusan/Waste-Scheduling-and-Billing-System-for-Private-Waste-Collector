# 📧 WSBS Email Verification Setup Guide

## 🎯 Complete Email Verification Flow

### **Current Flow:**
1. **User Registration** → Enters email in mobile app
2. **Email Sent** → Verification email with clickable link
3. **User Clicks Link** → Opens browser with verification page
4. **Verification Complete** → User returns to mobile app
5. **Registration Continues** → User completes remaining steps

---

## 🔧 Setup for Different Environments

### **1. Local Development**
```bash
# .env file
PUBLIC_URL=http://localhost:5000
BREVO_SMTP_USER=956d39001@smtp-brevo.com
BREVO_SMTP_KEY=rDkyQGwCxUvONgMF
BREVO_SENDER_EMAIL=2022_cete_delapenaj@online.htcgsc.edu.ph
```

### **2. Ngrok Development**
```bash
# Start ngrok
ngrok http 5000

# Update .env with ngrok URL
PUBLIC_URL=https://abc123.ngrok.io
NGROK_URL=https://abc123.ngrok.io
```

### **3. Production (Render)**
```bash
# Environment Variables in Render Dashboard
PUBLIC_URL=https://waste-scheduling-and-billing-system-for.onrender.com
BREVO_SMTP_USER=956d39001@smtp-brevo.com
BREVO_SMTP_KEY=rDkyQGwCxUvONgMF
BREVO_SENDER_EMAIL=2022_cete_delapenaj@online.htcgsc.edu.ph
```

---

## 📱 Mobile App Integration

### **Registration Flow:**
1. **Step 1**: User enters email
2. **Step 2**: App calls `/api/send-verification`
3. **Step 3**: User checks email and clicks verification link
4. **Step 4**: Browser opens with success page
5. **Step 5**: User returns to app and continues registration

### **Verification Check:**
The mobile app can check verification status:
```javascript
// In mobile app
const checkVerification = async (email) => {
  const response = await fetch(`${API_BASE_URL}/api/check-verification-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};
```

---

## 🌐 Email Verification Links

### **Link Format:**
```
{PUBLIC_URL}/api/verify-email?token={verification_token}
```

### **Examples:**
- **Local**: `http://localhost:5000/api/verify-email?token=abc123...`
- **Ngrok**: `https://abc123.ngrok.io/api/verify-email?token=abc123...`
- **Production**: `https://waste-scheduling-and-billing-system-for.onrender.com/api/verify-email?token=abc123...`

---

## ✅ Testing Email Verification

### **1. Test Email Configuration:**
```bash
cd backend
node test_email_config.js
```

### **2. Test Complete Flow:**
1. **Register** with real email address
2. **Check email** for verification link
3. **Click link** - should open success page
4. **Return to app** - continue registration
5. **Complete registration** - should work without email verification error

### **3. Verify URLs:**
- Check console logs for generated verification links
- Ensure links use correct domain (ngrok/production URL)
- Test links open properly in browser

---

## 🚨 Common Issues & Solutions

### **Issue 1: Wrong URL in Email Links**
**Problem**: Links point to localhost instead of ngrok/production
**Solution**: Set `PUBLIC_URL` environment variable correctly

### **Issue 2: Email Not Sending**
**Problem**: SMTP credentials missing or incorrect
**Solution**: Verify all BREVO_* environment variables are set

### **Issue 3: Verification Page Not Loading**
**Problem**: Backend not accessible from email link
**Solution**: Ensure backend is running and URL is correct

### **Issue 4: Mobile App Can't Continue**
**Problem**: App doesn't know verification was completed
**Solution**: User manually continues after seeing success page

---

## 🔄 Improved User Experience

### **Current Success Page Features:**
- ✅ Professional design with WSBS branding
- ✅ Clear success message with verified email
- ✅ Step-by-step instructions for user
- ✅ "Close Window" and "Back to App" buttons
- ✅ Auto-close after 30 seconds
- ✅ Mobile-responsive design

### **User Instructions:**
After clicking verification link, users see:
1. **Success confirmation** with their email address
2. **Clear next steps** to return to mobile app
3. **Easy-to-use buttons** to close the page
4. **Automatic cleanup** (page closes automatically)

---

## 🛠️ Environment Variables Checklist

### **Required for Email Service:**
- [ ] `BREVO_SMTP_USER=956d39001@smtp-brevo.com`
- [ ] `BREVO_SMTP_KEY=rDkyQGwCxUvONgMF`
- [ ] `BREVO_SENDER_EMAIL=2022_cete_delapenaj@online.htcgsc.edu.ph`

### **Required for Verification Links:**
- [ ] `PUBLIC_URL=https://your-domain.com` (or ngrok URL)

### **Optional:**
- [ ] `NGROK_URL=https://abc123.ngrok.io` (for ngrok detection)
- [ ] `NODE_ENV=production` (for production deployment)

---

## 📞 Support

If you encounter issues:
1. **Run diagnostics**: `node test_email_config.js`
2. **Check logs**: Look for verification link generation
3. **Test manually**: Try clicking generated links
4. **Verify environment**: Ensure all variables are set correctly

The email verification system is now fully configured for your deployment scenario! 🎉
