import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PaymentConfirmationModal = ({ 
  visible, 
  onClose, 
  request, 
  onConfirmPayment,
  loading = false 
}) => {
  const [actualBags, setActualBags] = useState(request?.bag_quantity?.toString() || '1');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [collectorNotes, setCollectorNotes] = useState('');

  const estimatedBags = request?.bag_quantity || 1;
  const pricePerBag = 25;
  const calculatedTotal = parseInt(actualBags || '1') * pricePerBag;

  const handleConfirm = () => {
    const bags = parseInt(actualBags);
    const amount = parseFloat(amountReceived);

    if (!bags || bags < 1) {
      Alert.alert('Error', 'Please enter a valid number of bags collected');
      return;
    }

    if (!amount || amount < 0) {
      Alert.alert('Error', 'Please enter the amount received from customer');
      return;
    }

    if (amount !== calculatedTotal) {
      Alert.alert(
        'Amount Mismatch',
        `Expected: ₱${calculatedTotal} (${bags} bags × ₱${pricePerBag})\nReceived: ₱${amount}\n\nDo you want to continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: () => submitPayment(bags, amount)
          }
        ]
      );
    } else {
      submitPayment(bags, amount);
    }
  };

  const submitPayment = (bags, amount) => {
    onConfirmPayment({
      requestId: request.request_id,
      bagsCollected: bags,
      amountReceived: amount,
      paymentMethod,
      collectorNotes: collectorNotes.trim() || null
    });
  };

  const resetForm = () => {
    setActualBags(request?.bag_quantity?.toString() || '1');
    setAmountReceived('');
    setPaymentMethod('cash');
    setCollectorNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!request) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Confirm Payment Collection</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.requestInfo}>
            <Text style={styles.requestTitle}>{request.waste_type}</Text>
            <Text style={styles.requestDescription}>{request.description}</Text>
            <Text style={styles.estimatedText}>
              Estimated: {estimatedBags} {estimatedBags === 1 ? 'bag' : 'bags'} × ₱{pricePerBag} = ₱{estimatedBags * pricePerBag}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Actual Bags Collected</Text>
            <TextInput
              style={styles.input}
              value={actualBags}
              onChangeText={setActualBags}
              keyboardType="numeric"
              placeholder="Number of bags"
            />
          </View>

          <View style={styles.calculationBox}>
            <Text style={styles.calculationText}>
              {actualBags || '1'} bags × ₱{pricePerBag} = ₱{calculatedTotal}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Amount Received from Customer</Text>
            <TextInput
              style={styles.input}
              value={amountReceived}
              onChangeText={setAmountReceived}
              keyboardType="numeric"
              placeholder="₱0.00"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {['cash', 'gcash', 'other'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === method && styles.paymentMethodActive
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text style={[
                    styles.paymentMethodText,
                    paymentMethod === method && styles.paymentMethodTextActive
                  ]}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Collector Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={collectorNotes}
              onChangeText={setCollectorNotes}
              placeholder="Any notes about the collection..."
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.confirmButton, loading && styles.confirmButtonDisabled]} 
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.confirmButtonText}>Processing...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.confirmButtonText}>Confirm Payment</Text>
                </>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  requestInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  estimatedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  calculationBox: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  calculationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    textAlign: 'center',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  paymentMethodActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  paymentMethodTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default PaymentConfirmationModal;
