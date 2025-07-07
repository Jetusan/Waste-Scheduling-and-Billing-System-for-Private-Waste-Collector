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
      // IMPORTANT: If testing on a mobile device or emulator, replace 'localhost' with your computer's local IP address (e.g., '192.168.x.x')
      // For Android emulator, use '10.0.2.2' instead of 'localhost'.
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      console.log('Login API response:', data);
      if (data.success && data.token) {
        console.log('Before saveAuth');
        try {
          await saveAuth(data.token, data.user.role);
          console.log('After saveAuth');
        } catch (e) {
          console.error('Error in saveAuth:', e);
        }
        // Redirect based on role
        console.log('User role:', data.user.role);
        if (data.user.role === 'resident') {
          console.log('Navigating to /resident');
          router.replace('/resident'); // Go to the resident tab navigator, HomePage tab will show by default
        } else {
          Alert.alert('Error', 'Not a resident account');
        }
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'An unexpected error occurred');
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

        <TouchableOpacity>
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
