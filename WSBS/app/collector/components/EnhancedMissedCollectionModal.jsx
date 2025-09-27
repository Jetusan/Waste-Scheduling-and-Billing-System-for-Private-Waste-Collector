import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EnhancedMissedCollectionModal = ({ 
  visible, 
  onClose, 
  onSubmit, 
  stop 
}) => {
  const [selectedFault, setSelectedFault] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [customIssue, setCustomIssue] = useState('');
  const [estimatedDelay, setEstimatedDelay] = useState('1');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const faultTypes = [
    { id: 'collector_fault', label: 'Collector Issue', icon: 'construct-outline', color: '#ff9800' },
    { id: 'resident_fault', label: 'Resident Unavailable', icon: 'person-outline', color: '#2196f3' }
  ];

  const collectorIssues = [
    { id: 'truck_breakdown', label: 'Truck Breakdown', severity: 'high', defaultDelay: 3 },
    { id: 'equipment_failure', label: 'Equipment Malfunction', severity: 'medium', defaultDelay: 1 },
    { id: 'route_blocked', label: 'Route Blocked/Inaccessible', severity: 'medium', defaultDelay: 2 },
    { id: 'traffic_delay', label: 'Severe Traffic Delay', severity: 'low', defaultDelay: 1 },
    { id: 'weather_conditions', label: 'Weather Conditions', severity: 'medium', defaultDelay: 1 },
    { id: 'collector_emergency', label: 'Personal Emergency', severity: 'high', defaultDelay: 2 },
    { id: 'fuel_shortage', label: 'Fuel/Resource Shortage', severity: 'medium', defaultDelay: 1 },
    { id: 'safety_concern', label: 'Safety Concern', severity: 'high', defaultDelay: 1 },
    { id: 'custom', label: 'Other (Specify)', severity: 'medium', defaultDelay: 1 }
  ];

  const handleIssueSelect = (issue) => {
    setSelectedIssue(issue);
    setEstimatedDelay(issue.defaultDelay.toString());
    setShowCustomInput(issue.id === 'custom');
    if (issue.id !== 'custom') {
      setCustomIssue('');
    }
  };

  const handleSubmit = () => {
    if (!selectedFault) {
      Alert.alert('Required', 'Please select who was at fault');
      return;
    }

    if (selectedFault === 'collector_fault') {
      if (!selectedIssue) {
        Alert.alert('Required', 'Please select the specific issue');
        return;
      }
      
      if (selectedIssue.id === 'custom' && !customIssue.trim()) {
        Alert.alert('Required', 'Please describe the custom issue');
        return;
      }
    }

    const submissionData = {
      fault_type: selectedFault,
      issue_type: selectedIssue?.id || null,
      issue_description: selectedIssue?.id === 'custom' ? customIssue : selectedIssue?.label,
      severity: selectedIssue?.severity || 'low',
      estimated_delay_days: parseInt(estimatedDelay) || 1,
      additional_notes: additionalNotes,
      stop_id: stop?.stop_id,
      user_id: stop?.user_id,
      schedule_id: stop?.schedule_id
    };

    onSubmit(submissionData);
    resetForm();
  };

  const resetForm = () => {
    setSelectedFault(null);
    setSelectedIssue(null);
    setCustomIssue('');
    setEstimatedDelay('1');
    setAdditionalNotes('');
    setShowCustomInput(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#757575';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Report Missed Collection</Text>
            <TouchableOpacity onPress={() => { onClose(); resetForm(); }}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Resident Info */}
            <View style={styles.residentInfo}>
              <Text style={styles.residentName}>{stop?.resident_name || 'Unknown Resident'}</Text>
              <Text style={styles.residentAddress}>{stop?.address || 'No address'}</Text>
            </View>

            {/* Fault Type Selection */}
            <Text style={styles.sectionTitle}>Who was at fault?</Text>
            <View style={styles.faultTypeContainer}>
              {faultTypes.map((fault) => (
                <TouchableOpacity
                  key={fault.id}
                  style={[
                    styles.faultOption,
                    selectedFault === fault.id && { borderColor: fault.color, backgroundColor: `${fault.color}10` }
                  ]}
                  onPress={() => setSelectedFault(fault.id)}
                >
                  <Ionicons name={fault.icon} size={24} color={fault.color} />
                  <Text style={[styles.faultLabel, selectedFault === fault.id && { color: fault.color }]}>
                    {fault.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Collector Issue Details */}
            {selectedFault === 'collector_fault' && (
              <>
                <Text style={styles.sectionTitle}>What specific issue occurred?</Text>
                <View style={styles.issueContainer}>
                  {collectorIssues.map((issue) => (
                    <TouchableOpacity
                      key={issue.id}
                      style={[
                        styles.issueOption,
                        selectedIssue?.id === issue.id && styles.selectedIssue
                      ]}
                      onPress={() => handleIssueSelect(issue)}
                    >
                      <View style={styles.issueHeader}>
                        <Text style={styles.issueLabel}>{issue.label}</Text>
                        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(issue.severity) }]}>
                          <Text style={styles.severityText}>{issue.severity.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={styles.defaultDelay}>Default delay: {issue.defaultDelay} day(s)</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Issue Input */}
                {showCustomInput && (
                  <View style={styles.customInputContainer}>
                    <Text style={styles.inputLabel}>Describe the issue:</Text>
                    <TextInput
                      style={styles.textInput}
                      value={customIssue}
                      onChangeText={setCustomIssue}
                      placeholder="Please provide details about the issue..."
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                )}

                {/* Estimated Delay */}
                {selectedIssue && (
                  <View style={styles.delayContainer}>
                    <Text style={styles.inputLabel}>Estimated delay (days):</Text>
                    <View style={styles.delayInputContainer}>
                      <TouchableOpacity
                        style={styles.delayButton}
                        onPress={() => setEstimatedDelay(Math.max(1, parseInt(estimatedDelay) - 1).toString())}
                      >
                        <Ionicons name="remove" size={20} color="#666" />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.delayInput}
                        value={estimatedDelay}
                        onChangeText={setEstimatedDelay}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        style={styles.delayButton}
                        onPress={() => setEstimatedDelay((parseInt(estimatedDelay) + 1).toString())}
                      >
                        <Ionicons name="add" size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Additional Notes */}
            <View style={styles.notesContainer}>
              <Text style={styles.inputLabel}>Additional notes (optional):</Text>
              <TextInput
                style={styles.textInput}
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                placeholder="Any additional information..."
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => { onClose(); resetForm(); }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitText}>Submit Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  residentInfo: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  residentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  residentAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  faultTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  faultOption: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    gap: 8,
  },
  faultLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  issueContainer: {
    gap: 8,
    marginBottom: 16,
  },
  issueOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  selectedIssue: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  issueLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  defaultDelay: {
    fontSize: 12,
    color: '#666',
  },
  customInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  delayContainer: {
    marginBottom: 16,
  },
  delayInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  delayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  delayInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    width: 80,
  },
  notesContainer: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#4caf50',
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default EnhancedMissedCollectionModal;
