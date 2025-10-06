# 🌐 Cloudflare Tunnel Setup for WSBS

## 🚀 Quick Setup (Automated)

### **Step 1: Run the Setup Script**
```bash
# Double-click this file or run in Command Prompt:
setup-cloudflare-tunnel.bat
```

This will:
- ✅ Download Cloudflare Tunnel (cloudflared.exe)
- ✅ Install it to `C:\wsbs-tools\`
- ✅ Start the tunnel automatically

### **Step 2: Start Your Backend**
```bash
cd backend
npm start
```

### **Step 3: Start the Tunnel**
```bash
# Double-click this file:
start-tunnel.bat
```

### **Step 4: Copy the URL**
Look for output like:
```
2024-01-06T15:30:45Z INF +--------------------------------------------------------------------------------------------+
2024-01-06T15:30:45Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
2024-01-06T15:30:45Z INF |  https://abc-def-ghi.trycloudflare.com                                                     |
2024-01-06T15:30:45Z INF +--------------------------------------------------------------------------------------------+
```

### **Step 5: Update Your Environment**
Add to your `.env` file:
```bash
PUBLIC_URL=https://abc-def-ghi.trycloudflare.com
```

### **Step 6: Restart Backend & Test**
```bash
# Restart your backend
cd backend
npm start

# Test email configuration
node test_email_config.js
```

---

## 🔧 Manual Setup (If Automated Fails)

### **1. Download Cloudflared**
- Go to: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
- Download `cloudflared-windows-amd64.exe`
- Rename to `cloudflared.exe`
- Place in `C:\wsbs-tools\` (create folder if needed)

### **2. Start Backend**
```bash
cd backend
npm start
```

### **3. Start Tunnel**
```bash
# Open Command Prompt and run:
C:\wsbs-tools\cloudflared.exe tunnel --url http://localhost:5000
```

### **4. Configure Environment**
Copy the provided URL and add to `.env`:
```bash
PUBLIC_URL=https://your-tunnel-url.trycloudflare.com
```

---

## 🎯 Why Cloudflare Tunnel is Perfect for Deployment

### **✅ Advantages:**
- **Enterprise-grade reliability** (99.9% uptime)
- **Free forever** with unlimited usage
- **No account required** for basic tunnels
- **Automatic HTTPS** with valid SSL certificates
- **Global CDN** for fast access worldwide
- **Professional URLs** perfect for client demos
- **No firewall issues** - works through corporate networks

### **🔒 Security Features:**
- **End-to-end encryption** between your server and Cloudflare
- **DDoS protection** included automatically
- **No inbound firewall rules** needed
- **Secure by default** configuration

### **🌐 Perfect for WSBS Because:**
- **Email verification links** will work perfectly with HTTPS
- **Payment confirmations** require secure connections
- **Mobile app API calls** work seamlessly
- **Admin dashboard** accessible from anywhere
- **Client demonstrations** look professional

---

## 📱 Complete WSBS Flow with Cloudflare

### **Development Workflow:**
1. **Start Backend**: `npm start` in backend folder
2. **Start Tunnel**: Run `start-tunnel.bat`
3. **Update .env**: Add the Cloudflare URL
4. **Restart Backend**: To pick up new URL
5. **Test Everything**: Email verification, payments, mobile app

### **Email Verification Flow:**
1. **User registers** in mobile app
2. **Email sent** with link: `https://your-tunnel.trycloudflare.com/api/verify-email?token=...`
3. **User clicks link** - opens professional verification page
4. **User returns to app** - continues registration
5. **Perfect experience** with HTTPS and reliable connection

### **Payment Flow:**
1. **User subscribes** in mobile app
2. **PayMongo redirects** to: `https://your-tunnel.trycloudflare.com/api/payment/confirm`
3. **Secure HTTPS** ensures payment security
4. **Reliable connection** prevents payment failures

---

## 🧪 Testing Your Setup

### **1. Test Tunnel Connection:**
```bash
# Visit your tunnel URL in browser
https://your-tunnel-url.trycloudflare.com/health
# Should return: {"status":"ok","time":"..."}
```

### **2. Test Email Configuration:**
```bash
cd backend
node test_email_config.js
```

### **3. Test Mobile App:**
- Update mobile app API_BASE_URL to your tunnel URL
- Test registration with email verification
- Test payment flow

### **4. Test Admin Dashboard:**
- Visit: `https://your-tunnel-url.trycloudflare.com`
- Should show WSBS welcome page
- Test login and dashboard access

---

## 🚨 Troubleshooting

### **Tunnel Not Starting:**
- Ensure backend is running on port 5000
- Check Windows Firewall isn't blocking cloudflared
- Try running Command Prompt as Administrator

### **URL Not Working:**
- Wait 30-60 seconds after tunnel starts
- Check the exact URL in the tunnel output
- Ensure no typos when copying to .env

### **Email Links Not Working:**
- Verify PUBLIC_URL is set correctly in .env
- Restart backend after changing .env
- Test with: `node test_email_config.js`

### **Mobile App Can't Connect:**
- Update API_BASE_URL in mobile app config
- Ensure tunnel URL uses https://
- Check mobile device has internet connection

---

## 🎉 Success Indicators

When everything is working correctly:

✅ **Tunnel Status**: Shows "Your quick Tunnel has been created!"
✅ **Backend Logs**: Show tunnel URL in email verification links
✅ **Email Test**: `node test_email_config.js` passes
✅ **Browser Access**: Tunnel URL loads WSBS welcome page
✅ **Mobile App**: Can register and verify email successfully
✅ **Admin Dashboard**: Accessible via tunnel URL

---

## 📞 Need Help?

If you encounter any issues:
1. **Check the tunnel output** for error messages
2. **Verify backend is running** on port 5000
3. **Test with**: `node test_email_config.js`
4. **Check .env file** has correct PUBLIC_URL

Your WSBS system will now work perfectly with professional HTTPS URLs for all features! 🎉
