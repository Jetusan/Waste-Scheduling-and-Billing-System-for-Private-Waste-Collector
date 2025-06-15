// HSettings.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HSettings() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Ionicons name="settings-outline" size={80} color="#4CD964" />
      <Text style={styles.subtitle}>Customize your preferences here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    marginTop: 10,
  },
});
