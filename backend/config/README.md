# Backend Configuration Guide

This centralized configuration system allows you to manage all IP addresses and URLs from a single location.

## Configuration File Location
```
backend/config/config.js
```

## How to Update IP Address

When your local network changes, you only need to update **ONE** variable:

```javascript
// Change this IP address only when your local network changes
const LOCAL_IP = '192.168.100.36';  // <-- Update this line only
```

## What Gets Updated Automatically

When you change `LOCAL_IP`, these URLs are automatically updated:

### Payment Redirect URLs
- Success: `http://192.168.100.36:5000/api/billing/payment-redirect/success`
- Failed: `http://192.168.100.36:5000/api/billing/payment-redirect/failed`

### CORS Origins
- Admin panel: `http://192.168.100.36:3000`
- React Native Metro: `http://192.168.100.36:8081`
- Expo web: `http://192.168.100.36:19006`

### Server URLs
- Base URL: `http://192.168.100.36:5000`
- Localhost URL: `http://localhost:5000`

## Usage in Backend Files

Import the config in any backend file:

```javascript
const config = require('../config/config');

// Use config values
const baseUrl = config.BASE_URL;
const successUrl = config.PAYMENT_REDIRECT.SUCCESS;
const corsOrigins = config.CORS_ORIGINS;
```

## Files Already Updated

✅ `controller/billingController.js` - Uses centralized payment redirect URLs
✅ `index.js` - Uses centralized port and displays proper URLs on startup

## Benefits

1. **Single Point of Change**: Update IP address in one place only
2. **Consistency**: All URLs use the same IP address automatically
3. **Easy Maintenance**: No need to search and replace across multiple files
4. **Environment Flexibility**: Supports both local IP and localhost configurations

## Matching Frontend Config

This backend config works with your frontend config:
```
WSBS/app/config.js
```

Both use the same `LOCAL_IP` pattern for consistency across your entire application.
