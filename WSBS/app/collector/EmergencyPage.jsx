import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { getToken, getCollectorId } from '../auth';

const EmergencyPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Breakdown form state
  const [breakdownForm, setBreakdownForm] = useState({
    location: '',
    issue: '',
    severity: 'medium',
    description: ''
  });

  // Backup form state
  const [backupForm, setBackupForm] = useState({
    location: '',
    reason: '',
    urgency: 'normal'
  });

  // Message form state
  const [messageForm, setMessageForm] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const token = await getToken();
      const collectorId = await getCollectorId();
      
      const response = await fetch(`${API_BASE_URL}/api/collector/emergency/contacts?collector_id=${collectorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setContacts(data.contacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const reportBreakdown = async () => {
    if (!breakdownForm.location || !breakdownForm.issue) {
      Alert.alert('Error', 'Please fill in location and issue description');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const collectorId = await getCollectorId();

      const response = await fetch(`${API_BASE_URL}/api/collector/emergency/breakdown`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          collector_id: parseInt(collectorId),
          truck_id: 1, // This should be dynamic based on collector's truck
          location: breakdownForm.location,
          issue: breakdownForm.issue,
          severity: breakdownForm.severity,
          description: breakdownForm.description
        })
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert(
          'Breakdown Reported',
          `Emergency response team notified. ${data.notifications_sent} nearby collectors have been alerted for backup assistance.`,
          [{ text: 'OK', onPress: () => setShowBreakdownModal(false) }]
        );
        setBreakdownForm({ location: '', issue: '', severity: 'medium', description: '' });
      } else {
        Alert.alert('Error', data.error || 'Failed to report breakdown');
      }
    } catch (error) {
      console.error('Error reporting breakdown:', error);
      Alert.alert('Error', 'Failed to report breakdown. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requestBackup = async () => {
    if (!backupForm.location || !backupForm.reason) {
      Alert.alert('Error', 'Please fill in location and reason');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const collectorId = await getCollectorId();

      const response = await fetch(`${API_BASE_URL}/api/collector/emergency/request-backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          collector_id: parseInt(collectorId),
          location: backupForm.location,
          reason: backupForm.reason,
          urgency: backupForm.urgency
        })
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert(
          'Backup Requested',
          `Backup request sent to ${data.notified_collectors} nearby collectors.`,
          [{ text: 'OK', onPress: () => setShowBackupModal(false) }]
        );
        setBackupForm({ location: '', reason: '', urgency: 'normal' });
      } else {
        Alert.alert('Error', data.error || 'Failed to request backup');
      }
    } catch (error) {
      console.error('Error requesting backup:', error);
      Alert.alert('Error', 'Failed to request backup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedContact || !messageForm.subject || !messageForm.message) {
      Alert.alert('Error', 'Please select a contact and fill in subject and message');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const collectorId = await getCollectorId();

      const response = await fetch(`${API_BASE_URL}/api/collector/emergency/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_collector_id: parseInt(collectorId),
          to_collector_id: parseInt(selectedContact.id),
          subject: messageForm.subject,
          message: messageForm.message,
          priority: messageForm.priority
        })
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert(
          'Message Sent',
          `Message sent to ${selectedContact.name}`,
          [{ text: 'OK', onPress: () => setShowMessageModal(false) }]
        );
        setMessageForm({ subject: '', message: '', priority: 'normal' });
        setSelectedContact(null);
      } else {
        Alert.alert('Error', data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const EmergencyButton = ({ icon, title, subtitle, color, onPress, iconColor = '#fff' }) => (
    <TouchableOpacity style={[styles.emergencyButton, { backgroundColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={32} color={iconColor} />
      <Text style={styles.buttonTitle}>{title}</Text>
      <Text style={styles.buttonSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  const ContactItem = ({ contact, onPress }) => (
    <TouchableOpacity style={styles.contactItem} onPress={() => onPress(contact)}>
      <View style={styles.contactIcon}>
        <Ionicons 
          name={contact.type === 'admin' ? 'shield-checkmark' : 'person'} 
          size={24} 
          color={contact.type === 'admin' ? '#FF9800' : '#4CAF50'} 
        />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactDetails}>
          {contact.type === 'admin' ? 'Administrator' : `Truck: ${contact.truck}`}
        </Text>
        {contact.phone && <Text style={styles.contactPhone}>{contact.phone}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency & Communication</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Emergency Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Emergency Actions</Text>
          
          <View style={styles.emergencyGrid}>
            <EmergencyButton
              icon="warning"
              title="Report Breakdown"
              subtitle="Truck malfunction or breakdown"
              color="#F44336"
              onPress={() => setShowBreakdownModal(true)}
            />
            
            <EmergencyButton
              icon="people"
              title="Request Backup"
              subtitle="Need assistance from other collectors"
              color="#FF9800"
              onPress={() => setShowBackupModal(true)}
            />
          </View>
        </View>

        {/* Communication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Communication</Text>
          
          <TouchableOpacity 
            style={styles.communicationButton}
            onPress={() => setShowMessageModal(true)}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color="#2196F3" />
            <View style={styles.communicationText}>
              <Text style={styles.communicationTitle}>Send Message</Text>
              <Text style={styles.communicationSubtitle}>Contact other collectors or admin</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Emergency Contacts</Text>
          
          {contacts.map((contact, index) => (
            <ContactItem 
              key={index} 
              contact={contact} 
              onPress={(contact) => {
                setSelectedContact(contact);
                setShowMessageModal(true);
              }}
            />
          ))}
        </View>
      </ScrollView>

      {/* Breakdown Modal */}
      <Modal visible={showBreakdownModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🚨 Report Breakdown</Text>
            <TouchableOpacity onPress={() => setShowBreakdownModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Location *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Where is the breakdown occurring?"
              value={breakdownForm.location}
              onChangeText={(text) => setBreakdownForm({...breakdownForm, location: text})}
            />
            
            <Text style={styles.inputLabel}>Issue Type *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Engine problem, flat tire, etc."
              value={breakdownForm.issue}
              onChangeText={(text) => setBreakdownForm({...breakdownForm, issue: text})}
            />
            
            <Text style={styles.inputLabel}>Severity</Text>
            <View style={styles.severityButtons}>
              {['low', 'medium', 'high', 'critical'].map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={[
                    styles.severityButton,
                    breakdownForm.severity === severity && styles.severityButtonActive
                  ]}
                  onPress={() => setBreakdownForm({...breakdownForm, severity})}
                >
                  <Text style={[
                    styles.severityButtonText,
                    breakdownForm.severity === severity && styles.severityButtonTextActive
                  ]}>
                    {severity.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.inputLabel}>Additional Details</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Any additional information..."
              value={breakdownForm.description}
              onChangeText={(text) => setBreakdownForm({...breakdownForm, description: text})}
              multiline
              numberOfLines={4}
            />
            
            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: '#F44336' }]}
              onPress={reportBreakdown}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Report Breakdown</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Backup Modal */}
      <Modal visible={showBackupModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🆘 Request Backup</Text>
            <TouchableOpacity onPress={() => setShowBackupModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Location *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Where do you need backup?"
              value={backupForm.location}
              onChangeText={(text) => setBackupForm({...backupForm, location: text})}
            />
            
            <Text style={styles.inputLabel}>Reason *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Why do you need backup assistance?"
              value={backupForm.reason}
              onChangeText={(text) => setBackupForm({...backupForm, reason: text})}
              multiline
              numberOfLines={3}
            />
            
            <Text style={styles.inputLabel}>Urgency</Text>
            <View style={styles.severityButtons}>
              {['low', 'normal', 'high', 'critical'].map((urgency) => (
                <TouchableOpacity
                  key={urgency}
                  style={[
                    styles.severityButton,
                    backupForm.urgency === urgency && styles.severityButtonActive
                  ]}
                  onPress={() => setBackupForm({...backupForm, urgency})}
                >
                  <Text style={[
                    styles.severityButtonText,
                    backupForm.urgency === urgency && styles.severityButtonTextActive
                  ]}>
                    {urgency.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: '#FF9800' }]}
              onPress={requestBackup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Request Backup</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Message Modal */}
      <Modal visible={showMessageModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>💬 Send Message</Text>
            <TouchableOpacity onPress={() => setShowMessageModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>To *</Text>
            <TouchableOpacity 
              style={styles.contactSelector}
              onPress={() => {
                // Show contact picker
                Alert.alert(
                  'Select Contact',
                  'Choose who to send the message to',
                  contacts.map(contact => ({
                    text: contact.name,
                    onPress: () => setSelectedContact(contact)
                  })).concat([{ text: 'Cancel', style: 'cancel' }])
                );
              }}
            >
              <Text style={selectedContact ? styles.selectedContactText : styles.placeholderText}>
                {selectedContact ? selectedContact.name : 'Select a contact...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.inputLabel}>Subject *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Message subject"
              value={messageForm.subject}
              onChangeText={(text) => setMessageForm({...messageForm, subject: text})}
            />
            
            <Text style={styles.inputLabel}>Message *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Type your message here..."
              value={messageForm.message}
              onChangeText={(text) => setMessageForm({...messageForm, message: text})}
              multiline
              numberOfLines={5}
            />
            
            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.severityButtons}>
              {['low', 'normal', 'high', 'urgent'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.severityButton,
                    messageForm.priority === priority && styles.severityButtonActive
                  ]}
                  onPress={() => setMessageForm({...messageForm, priority})}
                >
                  <Text style={[
                    styles.severityButtonText,
                    messageForm.priority === priority && styles.severityButtonTextActive
                  ]}>
                    {priority.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: '#2196F3' }]}
              onPress={sendMessage}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Send Message</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emergencyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emergencyButton: {
    flex: 0.48,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  communicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  communicationText: {
    flex: 1,
    marginLeft: 12,
  },
  communicationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  communicationSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contactDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  contactPhone: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  severityButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  severityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  severityButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  severityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  severityButtonTextActive: {
    color: '#fff',
  },
  contactSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectedContactText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default EmergencyPage;
