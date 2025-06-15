const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with your service account
const serviceAccount = require('../firebase-credentials.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  // Handle initialization error
  console.error('Firebase Admin initialization error:', error);
}

const validateFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error validating Firebase token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = validateFirebaseToken;
