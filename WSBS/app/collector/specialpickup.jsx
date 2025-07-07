import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';

const SpecialPickup = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Special Pickup Request</Text>
        <View style={{ width: 24 }} /> {/* Spacer for alignment */}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Info */}
        <View style={styles.userSection}>
          <Text style={styles.userName}>Jim Yosef</Text>
          <Text style={styles.userId}>User ID: #123456</Text>
        </View>

        {/* Details List */}
        <View style={styles.detailsCard}>
          <View style={styles.detailItem}>
            <MaterialIcons 
              name={false ? 'check-box' : 'check-box-outline-blank'} 
              size={24} 
              color="#4CAF50" 
            />
            <Text style={styles.detailText}>SARANGANI HOMES PHASE I SUBDIVISION</Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialIcons 
              name={false ? 'check-box' : 'check-box-outline-blank'} 
              size={24} 
              color="#4CAF50" 
            />
            <Text style={styles.detailText}>Today, 4:00 PM</Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialIcons 
              name={'check-box'} 
              size={24} 
              color="#4CAF50" 
            />
            <Text style={styles.detailText}>Household, Mixed</Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialIcons 
              name={false ? 'check-box' : 'check-box-outline-blank'} 
              size={24} 
              color="#4CAF50" 
            />
            <Text style={styles.detailText}>5 large bags (~20 kg)</Text>
          </View>
        </View>

        {/* Attached Photos */}
        <Text style={styles.sectionTitle}>Attached Photos:</Text>
        <View style={styles.photosContainer}>
          {[1, 2, 3].map((item, index) => (
            <View key={index} style={styles.photoPlaceholder}>
              <Text style={styles.photoText}>100 + 100</Text>
            </View>
          ))}
        </View>

        {/* Message Input */}
        <View style={styles.messageInput}>
          <Text style={styles.inputPlaceholder}>Type a message...</Text>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.navigateButton}>
          <Feather name="navigation" size={20} color="white" />
          <Text style={styles.buttonText}>Navigate to Pickup</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.collectedButton}>
          <Text style={[styles.buttonText, { color: '#4CAF50' }]}>Mark as Collected</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  userSection: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: '#666',
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    color: '#666',
  },
  messageInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    height: 100,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputPlaceholder: {
    color: '#999',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navigateButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectedButton: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SpecialPickup;