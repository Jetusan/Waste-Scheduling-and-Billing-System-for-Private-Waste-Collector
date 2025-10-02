# Fix WebSocket Module Resolution Error

## 🔴 Error
```
Unable to resolve module socket.io-client from app\contexts\WebSocketContext.jsx
```

## ✅ Solution

### **Step 1: Stop Metro Bundler**
Press `Ctrl+C` in the terminal where Expo is running.

### **Step 2: Navigate to WSBS Directory**
```bash
cd C:\Users\jytti\OneDrive\Desktop\WASTE\WSBS
```

### **Step 3: Clear Cache and Restart**

**Option A: Clear and restart in one command**
```bash
npx expo start --clear
```

**Option B: Manual cache clear**
```bash
# Delete cache folder
rmdir /s /q node_modules\.cache

# Restart Expo
npm start
```

**Option C: Full clean (if above doesn't work)**
```bash
# Delete node_modules and reinstall
rmdir /s /q node_modules
npm install
npm start
```

### **Step 4: Verify Package Installation**
```bash
npm list socket.io-client
```

Should show:
```
wsbs@1.0.0
└── socket.io-client@4.7.2
```

---

## 🔍 Why This Happens

Metro bundler (React Native's JavaScript bundler) caches module resolutions. When you install a new package while Metro is running, it doesn't automatically detect the new module. You must:

1. **Stop Metro** (Ctrl+C)
2. **Clear cache** (--clear flag or delete cache folder)
3. **Restart Metro**

---

## 🚀 After Fix

Once Metro restarts successfully, you should see:

```
✅ WebSocket connected: abc123
✅ Joined room: { room: 'collector_1', collectorId: 1 }
```

Instead of:
```
❌ WebSocket connection error: websocket error
```

---

## 🔧 Additional Troubleshooting

### If still getting errors after cache clear:

**1. Check package.json has the dependency:**
```json
"dependencies": {
  "socket.io-client": "^4.7.2"
}
```

**2. Reinstall dependencies:**
```bash
cd WSBS
rm -rf node_modules package-lock.json
npm install
```

**3. Check backend is running:**
```bash
cd backend
npm start
```

Backend should show:
```
✅ Database connected successfully!
🔌 WebSocket server initialized
Server running on port 5000
```

**4. Check network connectivity:**
- Ensure mobile device and backend are on same network
- Check firewall isn't blocking port 5000
- Verify API_BASE_URL in `WSBS/app/config.js` is correct

---

## 📝 Quick Command Reference

```bash
# In WSBS directory:
npx expo start --clear          # Clear cache and start
npm start -- --reset-cache      # Alternative cache clear
npm list socket.io-client       # Verify installation

# In backend directory:
npm start                       # Start backend server
```

---

## ✅ Success Indicators

After successful fix, you should see in Metro logs:

```
✅ No more "Unable to resolve" errors
✅ App loads successfully
✅ Console shows: "🔌 Connecting to WebSocket"
✅ Console shows: "✅ WebSocket connected"
✅ Console shows: "✅ Joined room"
```

And in the app:
- Green "Live" badge appears on collector homepage
- No error messages
- Stats update in real-time when collections are completed
