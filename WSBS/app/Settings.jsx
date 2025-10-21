import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken, getUserId, logout } from './auth';
import { API_BASE_URL } from './config';

const Settings = () => {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: 'Loading...',
    email: 'Loading...',
    address: 'Loading...',
    barangay: 'Loading...'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    loadUserInfo();
  }, []);

  const loadSettings = async () => {
    try {
      const notifications = await AsyncStorage.getItem('notifications_enabled');
      const location = await AsyncStorage.getItem('location_enabled');
      const dark = await AsyncStorage.getItem('dark_mode');
      
      if (notifications !== null) setNotificationsEnabled(JSON.parse(notifications));
      if (location !== null) setLocationEnabled(JSON.parse(location));
      if (dark !== null) setDarkMode(JSON.parse(dark));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadUserInfo = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const userId = await getUserId();
      
      if (!token || !userId) {
        setUserInfo({
          name: 'Guest User',
          email: 'Not logged in',
          address: 'No address set',
          barangay: 'Unknown'
        });
        setLoading(false);
        return;
      }

      // Fetch real user profile from API
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('👤 User profile loaded:', data);
        
        setUserInfo({
          name: data.user?.full_name || `${data.user?.first_name || ''} ${data.user?.last_name || ''}`.trim() || 'Unknown User',
          email: data.user?.email || 'No email',
          address: data.user?.full_address || data.user?.address || 'No address set',
          barangay: data.user?.barangay_name || 'Unknown barangay'
        });
      } else {
        console.error('Failed to fetch user profile:', response.status);
        setUserInfo({
          name: 'Error loading profile',
          email: 'Error loading email',
          address: 'Error loading address',
          barangay: 'Error loading barangay'
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      setUserInfo({
        name: 'Error loading profile',
        email: 'Network error',
        address: 'Unable to load address',
        barangay: 'Unable to load barangay'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const handleNotificationToggle = (value) => {
    setNotificationsEnabled(value);
    saveSetting('notifications_enabled', value);
  };

  const handleLocationToggle = (value) => {
    setLocationEnabled(value);
    saveSetting('location_enabled', value);
  };

  const handleDarkModeToggle = (value) => {
    setDarkMode(value);
    saveSetting('dark_mode', value);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use the proper logout function
              await logout();
              router.replace('/role');
            } catch (error) {
              console.error('Error during logout:', error);
              // Fallback manual cleanup
              await AsyncStorage.multiRemove(['token', 'user_id', 'user_role']);
              router.replace('/role');
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    // Navigate to profile editing screen
    router.push('/resident/Profile');
  };

  const handlePaymentMethods = () => {
    // Navigate to payment methods screen
    router.push('/PaymentPage');
  };

  const handleHelp = () => {
    Alert.alert(
      'Help & FAQ',
      'Common Questions:\n\n• How to schedule a pickup?\n• Payment methods\n• Collection times\n• Contact support\n\nFor more help, contact our support team.',
      [{ text: 'OK' }]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Need help? Contact us:\n\n📧 Email: support@wasteapp.com\n📞 Phone: (083) 123-4567\n🕒 Hours: 8AM - 5PM Mon-Fri\n\nOr visit our office at General Santos City.',
      [
        { text: 'OK' },
        { 
          text: 'Call Now', 
          onPress: () => Alert.alert('Calling', 'This would open your phone dialer')
        }
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate Our App',
      'Help us improve by rating the app!\n\n⭐⭐⭐⭐⭐\n\nYour feedback helps us provide better service.',
      [
        { text: 'Later' },
        { text: 'Rate Now', onPress: () => Alert.alert('Thank You!', 'Thank you for your feedback!') }
      ]
    );
  };

  const handleTermsPrivacy = () => {
    router.push('/TermsAndConditions');
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightComponent, iconColor = '#4CAF50' }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          {icon}
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent || <Ionicons name="chevron-forward" size={20} color="#666" />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.userInfoCard}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={60} color="#4CAF50" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{loading ? 'Loading...' : userInfo.name}</Text>
              <Text style={styles.userEmail}>{loading ? 'Loading...' : userInfo.email}</Text>
              <Text style={styles.userAddress}>{loading ? 'Loading...' : `${userInfo.barangay}, ${userInfo.address}`}</Text>
            </View>
          </View>
          
          <SettingItem
            icon={<Ionicons name="person" size={24} color="#4CAF50" />}
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={handleEditProfile}
          />
          
          <SettingItem
            icon={<Ionicons name="location" size={24} color="#2196F3" />}
            title="Home Location"
            subtitle="Set your home address"
            onPress={() => router.push('/SetHomeLocation')}
            iconColor="#2196F3"
          />
          
          <SettingItem
            icon={<MaterialIcons name="payment" size={24} color="#FF9800" />}
            title="Payment Methods"
            subtitle="Manage your payment options"
            onPress={handlePaymentMethods}
            iconColor="#FF9800"
          />
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <SettingItem
            icon={<Ionicons name="notifications" size={24} color="#9C27B0" />}
            title="Notifications"
            subtitle="Collection reminders and updates"
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
              />
            }
            iconColor="#9C27B0"
          />
          
          <SettingItem
            icon={<Ionicons name="location-outline" size={24} color="#00BCD4" />}
            title="Location Services"
            subtitle="Allow location access for better service"
            rightComponent={
              <Switch
                value={locationEnabled}
                onValueChange={handleLocationToggle}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={locationEnabled ? '#fff' : '#f4f3f4'}
              />
            }
            iconColor="#00BCD4"
          />
          
          <SettingItem
            icon={<Ionicons name="moon" size={24} color="#673AB7" />}
            title="Dark Mode"
            subtitle="Switch to dark theme"
            rightComponent={
              <Switch
                value={darkMode}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={darkMode ? '#fff' : '#f4f3f4'}
              />
            }
            iconColor="#673AB7"
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <SettingItem
            icon={<Ionicons name="help-circle" size={24} color="#607D8B" />}
            title="Help & FAQ"
            subtitle="Get help and find answers"
            onPress={handleHelp}
            iconColor="#607D8B"
          />
          
          <SettingItem
            icon={<Ionicons name="chatbubble" size={24} color="#795548" />}
            title="Contact Support"
            subtitle="Get in touch with our team"
            onPress={handleContactSupport}
            iconColor="#795548"
          />
          
          <SettingItem
            icon={<Ionicons name="star" size={24} color="#FFC107" />}
            title="Rate App"
            subtitle="Help us improve the app"
            onPress={handleRateApp}
            iconColor="#FFC107"
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <SettingItem
            icon={<Ionicons name="information-circle" size={24} color="#9E9E9E" />}
            title="App Version"
            subtitle="1.0.0"
            rightComponent={<Text style={styles.versionText}>1.0.0</Text>}
            iconColor="#9E9E9E"
          />
          
          <SettingItem
            icon={<Ionicons name="document-text" size={24} color="#9E9E9E" />}
            title="Terms & Privacy"
            subtitle="Read our terms and privacy policy"
            onPress={handleTermsPrivacy}
            iconColor="#9E9E9E"
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#F44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userAddress: {
    fontSize: 12,
    color: '#999',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 32,
  },
});

export default Settings;
