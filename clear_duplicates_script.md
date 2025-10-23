# 🗑️ Clear Duplicate Images - Testing Script

## **Quick API Calls to Clear Duplicates:**

### **Method 1: Clear All Your Records**
```bash
# Using curl (if you have it)
curl -X POST "https://waste-scheduling-and-billing-system-for.onrender.com/api/testing/clear-duplicates" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Using Postman or browser console:
fetch('https://waste-scheduling-and-billing-system-for.onrender.com/api/testing/clear-duplicates', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0MywidXNlcm5hbWUiOiJicmVudDEyMyIsImlhdCI6MTc2MTIyODQ3MywiZXhwIjoxNzYxMzE0ODczfQ.uft9yHHg3hc-DlfOGr9rFJKjfDP4hjNNHgHRQRrUWa8',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('✅ Cleared:', data));
```

### **Method 2: Clear Specific Record**
```bash
# Clear verification ID 3 (the duplicate one)
fetch('https://waste-scheduling-and-billing-system-for.onrender.com/api/testing/clear-verification/3', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0MywidXNlcm5hbWUiOiJicmVudDEyMyIsImlhdCI6MTc2MTIyODQ3MywiZXhwIjoxNzYxMzE0ODczfQ.uft9yHHg3hc-DlfOGr9rFJKjfDP4hjNNHgHRQRrUWa8',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('✅ Cleared:', data));
```

### **Method 3: Check Your Records**
```bash
# See all your current verifications
fetch('https://waste-scheduling-and-billing-system-for.onrender.com/api/testing/my-verifications', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0MywidXNlcm5hbWUiOiJicmVudDEyMyIsImlhdCI6MTc2MTIyODQ3MywiZXhwIjoxNzYxMzE0ODczfQ.uft9yHHg3hc-DlfOGr9rFJKjfDP4hjNNHgHRQRrUWa8',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('📋 Your records:', data));
```

## **Easiest Method - Browser Console:**

1. **Open your browser** (Chrome/Firefox)
2. **Press F12** to open Developer Tools
3. **Go to Console tab**
4. **Paste this code:**

```javascript
// Clear all duplicates for testing
fetch('https://waste-scheduling-and-billing-system-for.onrender.com/api/testing/clear-duplicates', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0MywidXNlcm5hbWUiOiJicmVudDEyMyIsImlhdCI6MTc2MTIyODQ3MywiZXhwIjoxNzYxMzE0ODczfQ.uft9yHHg3hc-DlfOGr9rFJKjfDP4hjNNHgHRQRrUWa8',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('✅ SUCCESS:', data);
  alert(`Cleared ${data.cleared_records} duplicate records! You can now test again.`);
})
.catch(error => {
  console.error('❌ ERROR:', error);
  alert('Error clearing duplicates: ' + error.message);
});
```

5. **Press Enter**
6. **You'll see success message**
7. **Now you can test with same image again!**

## **Usage:**
- **Before each test:** Run the clear script
- **Test your payment:** Submit same image multiple times
- **Repeat as needed:** Clear and test again

**Now you can test the same image over and over! 🎉**
