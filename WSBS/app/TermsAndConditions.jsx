import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

const TermsAndConditions = ({ onAccept, onDecline }) => {
  const [accepted, setAccepted] = useState(false);
  const router = useRouter();

  const handleAccept = () => {
    if (!accepted) {
      Alert.alert('Acceptance Required', 'Please accept the terms and conditions to continue.');
      return;
    }
    onAccept && onAccept();
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Terms',
      'You must accept the terms and conditions to subscribe to our services. Would you like to go back?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go Back', onPress: () => onDecline && onDecline() }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Terms and Conditions</Text>
        <Text style={styles.subtitle}>WSBS Waste Collection Services</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Service Description</Text>
          <Text style={styles.text}>
            WSBS provides comprehensive waste collection services including regular household waste pickup, recyclable materials collection, and special waste disposal services. Our services are designed to maintain clean and sustainable communities.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Subscription Plans</Text>
          <Text style={styles.text}>
            • <Text style={styles.bold}>Basic Plan:</Text> Weekly collection of general household waste{'\n'}
            • <Text style={styles.bold}>Standard Plan:</Text> Weekly collection plus bi-weekly recyclables{'\n'}
            • <Text style={styles.bold}>Premium Plan:</Text> Weekly collection, bi-weekly recyclables, and monthly special waste pickup{'\n'}
            • <Text style={styles.bold}>Enterprise Plan:</Text> Customized collection schedule for commercial establishments
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Service Schedule</Text>
          <Text style={styles.text}>
            • Regular collections occur on designated days between 6:00 AM and 6:00 PM{'\n'}
            • Customers must place waste containers at designated pickup points by 6:00 AM{'\n'}
            • Missed collections due to improper placement will not be rescheduled{'\n'}
            • Service may be delayed due to weather conditions or unforeseen circumstances
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Waste Guidelines</Text>
          <Text style={styles.text}>
            • Only household waste and approved recyclables are accepted{'\n'}
            • Hazardous materials, medical waste, and construction debris are not included{'\n'}
            • Waste must be properly bagged and contained{'\n'}
            • Overweight containers (over 50kg) may incur additional charges
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Billing and Payment</Text>
          <Text style={styles.text}>
            • Monthly billing cycles based on subscription start date{'\n'}
            • Payment methods: GCash, Cash on Collection, Bank Transfer{'\n'}
            • Late payments may result in service suspension{'\n'}
            • All fees are subject to applicable taxes{'\n'}
            • Price adjustments may occur with 30-day notice
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Customer Responsibilities</Text>
          <Text style={styles.text}>
            • Maintain clean and accessible pickup areas{'\n'}
            • Report service issues within 24 hours{'\n'}
            • Provide accurate contact information{'\n'}
            • Notify WSBS of address changes or service modifications{'\n'}
            • Ensure waste containers are in good condition
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Service Modifications</Text>
          <Text style={styles.text}>
            • Plan changes require 7-day notice{'\n'}
            • Temporary service suspension available with 48-hour notice{'\n'}
            • Service cancellation requires 30-day written notice{'\n'}
            • Emergency service requests subject to availability and additional charges
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Liability and Insurance</Text>
          <Text style={styles.text}>
            • WSBS maintains comprehensive liability insurance{'\n'}
            • Customers are responsible for damage to containers during normal use{'\n'}
            • WSBS is not liable for damage to improperly secured waste{'\n'}
            • Force majeure events may affect service delivery
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Privacy and Data Protection</Text>
          <Text style={styles.text}>
            • Customer information is collected and processed in accordance with data protection laws{'\n'}
            • Personal data is used solely for service provision and billing{'\n'}
            • Customers have the right to access, correct, or delete their personal data{'\n'}
            • Data is stored securely and not shared with third parties without consent
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Dispute Resolution</Text>
          <Text style={styles.text}>
            • Customer complaints should be submitted through official channels{'\n'}
            • WSBS will respond to complaints within 48 hours{'\n'}
            • Unresolved disputes may be escalated to management{'\n'}
            • Legal disputes are subject to local jurisdiction
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Termination</Text>
          <Text style={styles.text}>
            • Either party may terminate with 30-day written notice{'\n'}
            • Immediate termination for breach of terms{'\n'}
            • Outstanding balances must be settled upon termination{'\n'}
            • WSBS will remove containers within 7 days of termination
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Information</Text>
          <Text style={styles.text}>
            For questions, concerns, or service requests:{'\n'}
            • Customer Service: +63 912 345 6789{'\n'}
            • Email: support@WSBS.ph{'\n'}
            • Emergency Hotline: +63 912 345 6790{'\n'}
            • Office Hours: Monday-Friday, 8:00 AM - 6:00 PM
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Updates to Terms</Text>
          <Text style={styles.text}>
            • These terms may be updated periodically{'\n'}
            • Customers will be notified of changes via email or app notification{'\n'}
            • Continued use of services constitutes acceptance of updated terms{'\n'}
            • Last updated: December 2024
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[styles.checkbox, accepted && styles.checkboxChecked]}
            onPress={() => setAccepted(!accepted)}
          >
            {accepted && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.checkboxText}>
            I have read, understood, and agree to the Terms and Conditions
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
            <Text style={styles.acceptButtonText}>Accept & Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f5e8',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  bold: {
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2E7D32',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  declineButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 22, // Add horizontal padding
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100, // Optional: ensures a minimum width
    marginRight: 8, // Optional: space between buttons
  },
  declineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 22, // Add horizontal padding
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100, // Optional: ensures a minimum width
    marginLeft: 8, // Optional: space between buttons
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TermsAndConditions; 