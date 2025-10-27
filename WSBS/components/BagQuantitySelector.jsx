import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BagQuantitySelector = ({ bagQuantity, setBagQuantity, pricePerBag = 25 }) => {
  const incrementBags = () => {
    setBagQuantity(prev => Math.min(prev + 1, 20)); // Max 20 bags
  };

  const decrementBags = () => {
    setBagQuantity(prev => Math.max(prev - 1, 1)); // Min 1 bag
  };

  const totalCost = bagQuantity * pricePerBag;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bag-outline" size={24} color="#4CAF50" />
        <Text style={styles.title}>Number of Bags</Text>
      </View>
      
      <Text style={styles.subtitle}>
        25kg rice sack size bags • ₱{pricePerBag} per bag
      </Text>

      <View style={styles.quantityContainer}>
        <TouchableOpacity 
          style={[styles.button, bagQuantity <= 1 && styles.buttonDisabled]}
          onPress={decrementBags}
          disabled={bagQuantity <= 1}
        >
          <Ionicons 
            name="remove" 
            size={24} 
            color={bagQuantity <= 1 ? '#ccc' : '#fff'} 
          />
        </TouchableOpacity>

        <View style={styles.quantityDisplay}>
          <Text style={styles.quantityNumber}>{bagQuantity}</Text>
          <Text style={styles.quantityLabel}>
            {bagQuantity === 1 ? 'bag' : 'bags'}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, bagQuantity >= 20 && styles.buttonDisabled]}
          onPress={incrementBags}
          disabled={bagQuantity >= 20}
        >
          <Ionicons 
            name="add" 
            size={24} 
            color={bagQuantity >= 20 ? '#ccc' : '#fff'} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Estimated Total:</Text>
        <Text style={styles.totalAmount}>₱{totalCost.toLocaleString()}</Text>
      </View>

      <View style={styles.noteContainer}>
        <Ionicons name="information-circle-outline" size={16} color="#666" />
        <Text style={styles.noteText}>
          Final price may vary based on actual waste collected
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#f0f0f0',
    elevation: 0,
    shadowOpacity: 0,
  },
  quantityDisplay: {
    alignItems: 'center',
    marginHorizontal: 40,
    minWidth: 80,
  },
  quantityNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    lineHeight: 40,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    textAlign: 'center',
    flex: 1,
  },
});

export default BagQuantitySelector;
