import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { saveAuth } from './auth'; // Import the auth utility
import { Feather } from '@expo/vector-icons';
import { API_BASE_URL } from './config';

const LoginScreen = () => {
  const [username, setUsername] = useState(''); // this uses the email input field
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    console.log('Login button pressed');
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // Use optimized login endpoint for cleaned database structure
      const response = await fetch(`${API_BASE_URL}/api/auth/login-enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password, 
          source: 'mobile_app' 
        }),
      });
      const data = await response.json();
      console.log('Enhanced login API response:', data);
      
      if (data.success && data.user) {
        console.log('Before saveAuth');
        try {
          // Use the real JWT token from the API response
          const authToken = data.token;
          // Since our API doesn't return role, we'll default to 'resident'
          const userRole = data.user.role || 'resident';
          await saveAuth(authToken, userRole);
          console.log('After saveAuth');
        } catch (e) {
          console.error('Error in saveAuth:', e);
        }
        
        // Show welcome message with user details  
        const welcomeMessage = `Welcome back, ${data.user.username}!`;
        Alert.alert('Login Successful! 🎉', welcomeMessage, [
          {
            text: 'Continue',
            onPress: () => {
              // Redirect based on role
              console.log('User role:', data.user.role);
              if (data.user.role === 'resident') {
                console.log('Navigating to /resident');
                router.replace('/resident');
              } else {
                Alert.alert('Error', 'Not a resident account');
              }
            }
          }
        ]);
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Network Error', 'Unable to connect to server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/role')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Resident Login</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            type={showPassword ? 'text' : 'password'}
          />
          <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.showHideButton}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={24} color="#3498db" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/forgotPassword')}>
          <Text style={styles.forgotPassword}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/RRegister')}>
            <Text style={styles.noteHighlight}>Register here</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  forgotPassword: {
    color: '#3498db',
    textAlign: 'right',
    marginTop: -10,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#2ecc71',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  noteContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  noteText: {
    color: '#555',
    fontSize: 16,
  },
  noteHighlight: {
    color: '#3498db',
    fontWeight: 'bold',
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    paddingRight: 70, // space for the show/hide button
    marginBottom: 20,
  },
  showHideButton: {
    position: 'absolute',
    right: 15,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen;
