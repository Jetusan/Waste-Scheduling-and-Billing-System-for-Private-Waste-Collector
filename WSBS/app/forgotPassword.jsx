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
import { Feather } from '@expo/vector-icons';
import { API_BASE_URL } from './config';

const ForgotPasswordScreen = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetOTP, setResetOTP] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: enter username, 2: enter new password
  const router = useRouter();

  const handleForgotPassword = async () => {
    if (!username) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (data.success) {
        setStep(2);
        Alert.alert(
          'Email Sent!', 
          'If an account with that username/email exists, a 6-digit reset code has been sent to your email. Please check your email and enter the code below.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to send reset email');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetOTP || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: resetOTP, 
          newPassword, 
          confirmNewPassword: confirmPassword 
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Password reset successfully', [
          { text: 'OK', onPress: () => router.push('/RLogin') }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to reset password');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to connect to server');
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
          onPress={() => router.push('/RLogin')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {step === 1 ? 'Forgot Password' : 'Reset Password'}
        </Text>

        {step === 1 ? (
          <>
            <Text style={styles.description}>
              Enter your username or email address and we'll send you a 6-digit reset code.
            </Text>
            
            <Text style={styles.label}>Username or Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username or email address"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Email</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.description}>
              Check your email for the 6-digit reset code, then enter it and your new password below.
            </Text>
            
            <Text style={styles.label}>6-Digit Reset Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit code from email"
              value={resetOTP}
              onChangeText={setResetOTP}
              keyboardType="number-pad"
              maxLength={6}
              autoCapitalize="none"
            />

            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
              <TouchableOpacity 
                onPress={() => {
                  console.log('👁️ New Password Eye pressed! Current:', showNewPassword);
                  setShowNewPassword(!showNewPassword);
                }}
                style={styles.eyeButton}
              >
                <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
              <TouchableOpacity 
                onPress={() => {
                  console.log('👁️ Confirm Password Eye pressed! Current:', showConfirmPassword);
                  setShowConfirmPassword(!showConfirmPassword);
                }}
                style={styles.eyeButton}
              >
                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
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
  passwordContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  passwordInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingRight: 50,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  button: {
    backgroundColor: '#3498db',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;
