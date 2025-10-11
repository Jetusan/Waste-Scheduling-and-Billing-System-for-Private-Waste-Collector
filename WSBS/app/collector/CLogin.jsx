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
import { saveAuth } from '../auth'; // Import the auth utility
import { API_BASE_URL } from '../config';
import { Feather } from '@expo/vector-icons';

const CollectorLoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePasswordChange = (text) => {
    setPassword(text);
  };

  const handleLogin = async () => {
    console.log('Login button pressed');
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Use API_BASE_URL for mobile compatibility
      const response = await fetch(`${API_BASE_URL}/api/auth/login-enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password, 
          source: 'collector_app' 
        }),
      });
      const data = await response.json();
      console.log('Login API response:', data);
      
      if (data.success) {
        // Check if we have a token (for mobile apps) or if we have user data
        if (data.token || data.user) {
          console.log('Before saveAuth');
          try {
            // Use token if available, otherwise create a session identifier
            const authToken = data.token || `session_${data.user.id}_${Date.now()}`;
            await saveAuth(authToken, data.user.role, data.user?.id);
            console.log('After saveAuth');

            // Resolve and persist collectors.collector_id for this user to speed up future screens
            try {
              const colRes = await fetch(`${API_BASE_URL}/api/collectors`);
              if (colRes.ok) {
                const list = await colRes.json();
                // Prefer mapping by user_id; if multiple rows exist, pick the latest by highest collector_id
                let match = null;
                if (Array.isArray(list)) {
                  const byUserId = list.filter(c => Number(c.user_id) === Number(data.user?.id));
                  if (byUserId.length > 0) {
                    byUserId.sort((a, b) => Number(b.collector_id) - Number(a.collector_id));
                    match = byUserId[0];
                  } else {
                    // Fallback: by username
                    const byUsername = list.filter(c => c.username === data.user?.username);
                    if (byUsername.length > 0) {
                      byUsername.sort((a, b) => Number(b.collector_id) - Number(a.collector_id));
                      match = byUsername[0];
                    }
                  }
                }
                if (match && match.collector_id) {
                  await saveAuth(authToken, data.user.role, data.user?.id, match.collector_id);
                  console.log('Saved collector_id:', match.collector_id);
                }
              }
            } catch (mapErr) {
              console.warn('Could not resolve collector_id at login:', mapErr?.message || mapErr);
            }
          } catch (e) {
            console.error('Error in saveAuth:', e);
          }
          
          // Redirect based on role
          console.log('User role:', data.user.role);
          if (data.user.role === 'collector') {
            console.log('Navigating to /collector/CHome');
            router.replace('/collector/CHome');
          } else {
            Alert.alert('Access Denied', 'This account does not have collector access. Please use a collector account or contact your administrator.');
          }
        } else {
          Alert.alert('Login Failed', 'Authentication token missing');
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
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/role')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Collector Login</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your username"
          value={username}
          onChangeText={setUsername}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            key={`password-${showPassword}`}
            style={styles.passwordInput}
            placeholder="Enter your password"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            keyboardType="default"
            maxLength={50}
            importantForAutofill="no"
          />
          <TouchableOpacity 
            onPress={() => {
              console.log('Collector - Current showPassword:', showPassword);
              setShowPassword(prev => !prev);
            }} 
            style={styles.showHideButton}
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={24} color="#3498db" />
          </TouchableOpacity>
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity onPress={() => router.push('/collector/ForgotPassword')}>
          <Text style={styles.forgotPassword}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
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

        {/* Contact Admin Note */}
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>Need an account? </Text>
          <Text style={styles.noteHighlight}>Contact your administrator</Text>
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
  },
  noteText: {
    color: '#555',
  },
  noteHighlight: {
    color: '#3498db',
    fontWeight: 'bold',
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

export default CollectorLoginScreen;