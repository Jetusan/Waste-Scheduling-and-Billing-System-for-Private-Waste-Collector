import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

class ApiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      isNetworkError: false,
      isAuthError: false 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ApiErrorBoundary caught an error:', error);
    
    // Detect error types
    const isNetworkError = error.message?.includes('Network') || 
                          error.message?.includes('fetch') ||
                          error.code === 'NETWORK_ERROR';
    
    const isAuthError = error.message?.includes('401') || 
                       error.message?.includes('Unauthorized') ||
                       error.status === 401;

    this.setState({
      error: error,
      isNetworkError,
      isAuthError
    });

    // Handle auth errors by clearing auth and redirecting
    if (isAuthError && this.props.onAuthError) {
      this.props.onAuthError();
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      isNetworkError: false,
      isAuthError: false 
    });
    
    // Call retry callback if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  getErrorMessage = () => {
    if (this.state.isNetworkError) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    if (this.state.isAuthError) {
      return 'Your session has expired. Please log in again.';
    }
    
    return this.props.fallbackMessage || 'Something went wrong while loading data. Please try again.';
  };

  getErrorIcon = () => {
    if (this.state.isNetworkError) {
      return 'wifi-outline';
    }
    
    if (this.state.isAuthError) {
      return 'lock-closed-outline';
    }
    
    return 'alert-circle-outline';
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons 
              name={this.getErrorIcon()} 
              size={64} 
              color="#FF6B6B" 
            />
            <Text style={styles.title}>
              {this.state.isAuthError ? 'Session Expired' : 'Connection Error'}
            </Text>
            <Text style={styles.message}>
              {this.getErrorMessage()}
            </Text>
            
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text style={styles.retryText}>
                {this.state.isAuthError ? 'Login Again' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useApiErrorHandler = () => {
  const router = useRouter();
  
  const handleApiError = (error) => {
    console.error('API Error:', error);
    
    // Handle auth errors
    if (error.status === 401 || error.message?.includes('401')) {
      // Clear auth and redirect to login
      import('../app/auth').then(({ logout }) => {
        logout().then(() => {
          router.replace('/role');
        });
      });
      return;
    }
    
    // Handle network errors
    if (error.message?.includes('Network') || error.code === 'NETWORK_ERROR') {
      // Could show a toast notification here
      console.warn('Network error detected');
      return;
    }
    
    // Generic error handling
    console.error('Unhandled API error:', error);
  };
  
  return { handleApiError };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4CD964',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ApiErrorBoundary;
