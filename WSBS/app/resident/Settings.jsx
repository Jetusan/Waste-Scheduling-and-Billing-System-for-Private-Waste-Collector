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
import { getToken, getUserId } from '../auth';

const Settings = () => {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: 'Loading...',
    email: 'Loading...',
    address: 'Loading...'
  });

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
      const token = await getToken();
      const userId = await getUserId();
      
      if (!token || !userId) return;

      // You can fetch user profile info here
      // For now, using placeholder data
      setUserInfo({
        name: 'John Doe',
        email: 'john.doe@example.com',
        address: 'City Heights, General Santos City'
      });
    } catch (error) {
      console.error('Error loading user info:', error);
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
              await AsyncStorage.multiRemove(['token', 'user_id', 'user_role']);
              router.replace('/auth/login');
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        }
      ]
    );
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
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          <SettingItem
            icon={<Ionicons name="person" size={24} color="#4CAF50" />}
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => router.push('/resident/Profile')}
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
            onPress={() => router.push('/resident/PaymentMethods')}
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
            onPress={() => router.push('/resident/Help')}
            iconColor="#607D8B"
          />
          
          <SettingItem
            icon={<Ionicons name="chatbubble" size={24} color="#795548" />}
            title="Contact Support"
            subtitle="Get in touch with our team"
            onPress={() => router.push('/resident/ContactSupport')}
            iconColor="#795548"
          />
          
          <SettingItem
            icon={<Ionicons name="star" size={24} color="#FFC107" />}
            title="Rate App"
            subtitle="Help us improve the app"
            onPress={() => Alert.alert('Rate App', 'Thank you for your feedback!')}
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
            onPress={() => router.push('/resident/TermsPrivacy')}
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
