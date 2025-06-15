import { FIREBASE_AUTH } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';

export const testFirebaseAuth = async (email, password) => {
  try {
    // Sign in user
    const userCredential = await signInWithEmailAndPassword(
      FIREBASE_AUTH,
      email,
      password
    );

    // Get the ID token
    const token = await userCredential.user.getIdToken();

    // Test the protected endpoint
    const response = await fetch('http://localhost:5000/api/auth-test', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('Protected endpoint response:', data);
    return data;
  } catch (error) {
    console.error('Auth test failed:', error);
    throw error;
  }
};
