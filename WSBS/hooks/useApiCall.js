import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../app/config';
import { getToken } from '../app/auth';

// Custom hook for safe API calls with automatic cleanup
export const useApiCall = () => {
  const abortControllerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cleanup function to abort ongoing requests
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Safe API call function
  const apiCall = useCallback(async (endpoint, options = {}) => {
    try {
      // Abort any ongoing request
      cleanup();
      
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError(null);

      // Get auth token
      const token = await getToken();
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Make the request
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: abortControllerRef.current.signal
      });

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return null;
      }

      // Handle non-ok responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Don't set error state if request was aborted (component unmounted)
      if (error.name !== 'AbortError') {
        setError(error.message || 'An unexpected error occurred');
        console.error('API call failed:', error);
      }
      return null;
    } finally {
      // Only update loading state if component is still mounted
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [cleanup]);

  return {
    apiCall,
    loading,
    error,
    cleanup
  };
};

// Hook for fetching data with automatic retry and cleanup
export const useFetch = (endpoint, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiCall, cleanup } = useApiCall();
  const mountedRef = useRef(true);

  const {
    dependencies = [],
    retryAttempts = 3,
    retryDelay = 1000,
    enabled = true
  } = options;

  const fetchData = useCallback(async (attempt = 1) => {
    if (!enabled || !mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const result = await apiCall(endpoint, options);
      
      if (mountedRef.current && result !== null) {
        setData(result);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      console.error(`Fetch attempt ${attempt} failed:`, err);
      
      // Retry logic
      if (attempt < retryAttempts) {
        setTimeout(() => {
          if (mountedRef.current) {
            fetchData(attempt + 1);
          }
        }, retryDelay * attempt);
      } else {
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint, apiCall, enabled, retryAttempts, retryDelay]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Manual refetch function
  const refetch = useCallback(() => {
    if (mountedRef.current) {
      fetchData();
    }
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch
  };
};

// Hook for mutations (POST, PUT, DELETE) with loading states
export const useMutation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { apiCall } = useApiCall();

  const mutate = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall(endpoint, {
        method: 'POST',
        ...options
      });
      return result;
    } catch (err) {
      setError(err.message || 'Mutation failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  return {
    mutate,
    loading,
    error
  };
};

export default useApiCall;
