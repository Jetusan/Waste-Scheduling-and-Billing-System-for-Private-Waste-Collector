# Logout Confirmation Dialog and Navigation Fix

## Problem Identified
The user reported that logout functionality was inconsistent across the app:
1. **Settings.jsx** - Had confirmation dialog but navigated to `/welcome` (wrong page)
2. **AccountPage.jsx** - No confirmation dialog, navigated to `/role` (correct page)
3. **CSettings.jsx** - No confirmation dialog, navigated to `/role` (correct page)

## Solution Applied

### ✅ **1. Fixed Settings.jsx Navigation**
**Problem:** Logout was going to `/welcome` instead of `/role`
**Fix:** Changed both navigation paths to go to `/role`

```javascript
// Before
router.replace('/welcome');

// After  
router.replace('/role');
```

**Files Modified:**
- `app/Settings.jsx` - Lines 143 and 148

### ✅ **2. Added Confirmation Dialog to AccountPage.jsx**
**Problem:** No confirmation dialog before logout
**Fix:** Added Alert confirmation dialog with Cancel/Logout options

```javascript
// Before - Direct logout
const handleLogout = async () => {
  try {
    await logout();
    router.replace('/role');
  } catch (error) {
    router.replace('/role');
  }
};

// After - With confirmation dialog
const handleLogout = () => {
  Alert.alert(
    'Logout',
    'Are you sure you want to logout?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          // Same logout logic as before
        }
      }
    ]
  );
};
```

**Files Modified:**
- `app/resident/AccountPage.jsx` - Lines 94-118

### ✅ **3. Added Confirmation Dialog to CSettings.jsx**
**Problem:** No confirmation dialog before logout
**Fix:** Added Alert import and confirmation dialog

```javascript
// Added Alert import
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Alert } from 'react-native';

// Added confirmation dialog (same pattern as AccountPage.jsx)
const handleLogout = () => {
  Alert.alert(
    'Logout',
    'Are you sure you want to logout?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          // Original logout logic
        }
      }
    ]
  );
};
```

**Files Modified:**
- `app/CSettings.jsx` - Lines 2 and 10-34

## ✅ **Verification - All Logout Functions Now Consistent**

### **Navigation Consistency:**
All logout functions now navigate to `/role` (role selection page):
- ✅ `Settings.jsx` → `/role` 
- ✅ `AccountPage.jsx` → `/role`
- ✅ `CSettings.jsx` → `/role`
- ✅ `ApiErrorBoundary.jsx` → `/role`
- ✅ `AuthGate.jsx` → `/role`

### **Confirmation Dialog Consistency:**
All logout functions now have confirmation dialogs:
- ✅ `Settings.jsx` - Already had confirmation dialog
- ✅ `AccountPage.jsx` - **Added** confirmation dialog
- ✅ `CSettings.jsx` - **Added** confirmation dialog

## **User Experience Improvements**

### **Before Fix:**
- **Inconsistent Navigation:** Some went to welcome page, others to role page
- **No Confirmation:** Some logout buttons worked immediately without asking
- **Confusing Flow:** Users ended up on different pages after logout

### **After Fix:**
- **Consistent Navigation:** All logout functions go to role selection page
- **Safety Confirmation:** All logout buttons ask "Are you sure?" before proceeding
- **Predictable Flow:** Users always end up at role selection to choose Resident/Collector

## **Technical Details**

### **Pages Explained:**
- **`/welcome`** - Initial app welcome screen (first-time users)
- **`/role`** - Role selection screen (Resident vs Collector choice)
- **Correct Flow:** Logout should go to `/role` so users can select their role again

### **Alert Dialog Pattern:**
```javascript
Alert.alert(
  'Logout',                          // Title
  'Are you sure you want to logout?', // Message
  [
    { text: 'Cancel', style: 'cancel' },           // Cancel button
    { text: 'Logout', style: 'destructive', ... } // Confirm button (red)
  ]
);
```

### **Logout Function Pattern:**
```javascript
const handleLogout = () => {
  Alert.alert(/* confirmation dialog */, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Logout',
      style: 'destructive',
      onPress: async () => {
        try {
          await logout();           // Clear auth data
          router.replace('/role');  // Go to role selection
        } catch (error) {
          router.replace('/role');  // Force navigation on error
        }
      }
    }
  ]);
};
```

## **Files Modified Summary**

1. **`app/Settings.jsx`**
   - Fixed navigation from `/welcome` to `/role`
   - Already had confirmation dialog (no changes needed)

2. **`app/resident/AccountPage.jsx`**
   - Added confirmation dialog with Alert.alert()
   - Navigation was already correct (`/role`)

3. **`app/CSettings.jsx`**
   - Added Alert import
   - Added confirmation dialog with Alert.alert()
   - Navigation was already correct (`/role`)

## **Result**
✅ **Consistent Logout Experience:** All logout buttons now ask for confirmation and navigate to the role selection page, providing a uniform and safe user experience across the entire app.
