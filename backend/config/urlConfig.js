/**
 * URL Configuration for WSBS
 * Handles different deployment scenarios (local, ngrok, production)
 */

// Get the appropriate base URL based on environment
const getBaseUrl = () => {
  // Priority order for tunnel services:
  // 1. Explicit PUBLIC_URL environment variable (highest priority)
  // 2. Specific tunnel service URLs
  // 3. Production URL
  // 4. Local development fallback
  
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL;
  }
  
  // Support for various tunnel services
  if (process.env.NGROK_URL) {
    return process.env.NGROK_URL;
  }
  
  if (process.env.LOCALTUNNEL_URL) {
    return process.env.LOCALTUNNEL_URL;
  }
  
  if (process.env.CLOUDFLARE_URL) {
    return process.env.CLOUDFLARE_URL;
  }
  
  if (process.env.SERVEO_URL) {
    return process.env.SERVEO_URL;
  }
  
  if (process.env.BORE_URL) {
    return process.env.BORE_URL;
  }
  
  if (process.env.PINGGY_URL) {
    return process.env.PINGGY_URL;
  }
  
  // Production URL (Render deployment)
  if (process.env.NODE_ENV === 'production') {
    return 'https://waste-scheduling-and-billing-system-for.onrender.com';
  }
  
  // Local development
  return 'http://localhost:5000';
};

// Get frontend URL for redirects
const getFrontendUrl = () => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  // For mobile app, we don't have a web frontend URL
  // This would be used if you had a web version
  return null;
};

// Build verification link
const buildVerificationLink = (token) => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/verify-email?token=${token}`;
};

// Build payment confirmation link
const buildPaymentLink = (sessionId) => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/payment/confirm?session=${sessionId}`;
};

// Log current configuration
const logConfiguration = () => {
  const currentUrl = getBaseUrl();
  const tunnelService = detectTunnelService();
  
  console.log('🔧 WSBS URL Configuration:');
  console.log(`   Base URL: ${currentUrl}`);
  console.log(`   Tunnel Service: ${tunnelService}`);
  console.log(`   Frontend URL: ${getFrontendUrl() || 'Not configured (mobile-only)'}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('📋 Available Environment Variables:');
  console.log(`   PUBLIC_URL: ${process.env.PUBLIC_URL || 'Not set'}`);
  console.log(`   NGROK_URL: ${process.env.NGROK_URL || 'Not set'}`);
  console.log(`   LOCALTUNNEL_URL: ${process.env.LOCALTUNNEL_URL || 'Not set'}`);
  console.log(`   CLOUDFLARE_URL: ${process.env.CLOUDFLARE_URL || 'Not set'}`);
  console.log(`   SERVEO_URL: ${process.env.SERVEO_URL || 'Not set'}`);
  console.log(`   BORE_URL: ${process.env.BORE_URL || 'Not set'}`);
  console.log(`   PINGGY_URL: ${process.env.PINGGY_URL || 'Not set'}`);
};

// Detect which tunnel service is being used
const detectTunnelService = () => {
  if (process.env.PUBLIC_URL) return 'Custom (PUBLIC_URL)';
  if (process.env.NGROK_URL) return 'Ngrok';
  if (process.env.LOCALTUNNEL_URL) return 'Localtunnel';
  if (process.env.CLOUDFLARE_URL) return 'Cloudflare Tunnel';
  if (process.env.SERVEO_URL) return 'Serveo';
  if (process.env.BORE_URL) return 'Bore';
  if (process.env.PINGGY_URL) return 'Pinggy';
  if (process.env.NODE_ENV === 'production') return 'Production (Render)';
  return 'Local Development';
};

module.exports = {
  getBaseUrl,
  getFrontendUrl,
  buildVerificationLink,
  buildPaymentLink,
  logConfiguration
};
