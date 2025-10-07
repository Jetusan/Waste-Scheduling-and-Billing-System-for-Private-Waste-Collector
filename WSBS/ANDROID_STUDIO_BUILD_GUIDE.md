# 🤖 Build APK with Android Studio (Windows)

## 📋 **Prerequisites**
1. **Download Android Studio**: https://developer.android.com/studio
2. **Install Android Studio** with default settings
3. **Install Java JDK 17** if not included

## 🔧 **Step-by-Step APK Build**

### **Step 1: Generate Android Project**
```bash
cd WSBS
npx expo prebuild --platform android --clear
```

### **Step 2: Open in Android Studio**
1. **Open Android Studio**
2. **File** → **Open**
3. **Navigate to**: `C:\Users\jytti\OneDrive\Desktop\WASTE\WSBS\android`
4. **Click OK** and wait for project to load

### **Step 3: Build APK**
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. **Wait for build** to complete (5-10 minutes)
3. **Click "locate"** when build finishes

### **Step 4: Find Your APK**
APK will be located at:
```
WSBS\android\app\build\outputs\apk\release\app-release.apk
```

## 🎯 **Production Configuration**
Your APK will automatically use:
- ✅ **Production backend**: https://waste-scheduling-and-billing-system-for.onrender.com
- ✅ **Deep linking**: wsbs://
- ✅ **GCash integration**: Ready for live payments
- ✅ **Email verification**: Production URLs

## 🚀 **Quick Build Script**
```bash
# Run this in WSBS folder
npx expo prebuild --platform android --clear
# Then open android folder in Android Studio and build
```

## ⚡ **Estimated Time**
- **Setup**: 30 minutes (first time only)
- **Build**: 5-10 minutes per APK
- **Total**: Much faster than 160-minute EAS queue!

## 🎉 **Benefits**
- ✅ **No waiting** in EAS queue
- ✅ **Free** (no monthly subscription)
- ✅ **Full control** over build process
- ✅ **Works on Windows**
- ✅ **Professional APK** output
