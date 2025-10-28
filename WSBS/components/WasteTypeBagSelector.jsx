import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import pricingService from '../app/services/pricingService';

const WasteTypeBagSelector = ({ wasteSelections, setWasteSelections, pricePerBag: propPricePerBag }) => {
  const [dynamicPricing, setDynamicPricing] = useState({
    pricePerBag: propPricePerBag || 25,
    loading: true
  });

  // Load dynamic pricing on component mount
  useEffect(() => {
    loadDynamicPricing();
  }, []);

  const loadDynamicPricing = async () => {
    try {
      const specialPickupPricing = await pricingService.getSpecialPickupPricing();
      setDynamicPricing({
        pricePerBag: specialPickupPricing.pricePerBag,
        loading: false
      });
      console.log('💰 Dynamic pricing loaded:', specialPickupPricing);
    } catch (error) {
      console.error('❌ Error loading dynamic pricing:', error);
      // Use fallback pricing
      setDynamicPricing({
        pricePerBag: propPricePerBag || 25,
        loading: false
      });
    }
  };

  const pricePerBag = dynamicPricing.pricePerBag;
  const wasteTypes = [
    { type: 'Non-Biodegradable', icon: 'cube-outline', color: '#FF5722' },
    { type: 'Biodegradable', icon: 'leaf-outline', color: '#4CAF50' },
    { type: 'Recyclable', icon: 'refresh-outline', color: '#2196F3' }
  ];

  const updateBagQuantity = (wasteType, quantity) => {
    const maxBags = 50; // Set a reasonable default max
    setWasteSelections(prev => ({
      ...prev,
      [wasteType]: Math.max(0, Math.min(quantity, maxBags)) // Min 0, Max 50
    }));
  };

  const incrementBags = (wasteType) => {
    const current = wasteSelections[wasteType] || 0;
    updateBagQuantity(wasteType, current + 1);
  };

  const decrementBags = (wasteType) => {
    const current = wasteSelections[wasteType] || 0;
    updateBagQuantity(wasteType, current - 1);
  };

  const getTotalBags = () => {
    return Object.values(wasteSelections).reduce((sum, quantity) => sum + (quantity || 0), 0);
  };

  const getTotalCost = () => {
    return getTotalBags() * pricePerBag;
  };

  const getSelectedWasteTypes = () => {
    return Object.entries(wasteSelections)
      .filter(([type, quantity]) => quantity > 0)
      .map(([type, quantity]) => `${type} (${quantity} ${quantity === 1 ? 'bag' : 'bags'})`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bag-outline" size={24} color="#4CAF50" />
        <Text style={styles.title}>Waste Type & Bag Quantity</Text>
      </View>
      
      <Text style={styles.subtitle}>
        Select waste types and specify bags for each • ₱{pricePerBag} per bag
      </Text>

      {wasteTypes.map((item) => {
        const quantity = wasteSelections[item.type] || 0;
        const isSelected = quantity > 0;
        
        return (
          <View key={item.type} style={[styles.wasteTypeRow, isSelected && styles.wasteTypeRowSelected]}>
            <View style={styles.wasteTypeInfo}>
              <View style={[styles.wasteTypeIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.wasteTypeText}>
                <Text style={[styles.wasteTypeName, isSelected && styles.wasteTypeNameSelected]}>
                  {item.type}
                </Text>
                {isSelected && (
                  <Text style={styles.wasteTypeSubtitle}>
                    {quantity} {quantity === 1 ? 'bag' : 'bags'} × ₱{pricePerBag} = ₱{quantity * pricePerBag}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.quantityControls}>
              <TouchableOpacity 
                style={[styles.controlButton, quantity <= 0 && styles.controlButtonDisabled]}
                onPress={() => decrementBags(item.type)}
                disabled={quantity <= 0}
              >
                <Ionicons 
                  name="remove" 
                  size={18} 
                  color={quantity <= 0 ? '#ccc' : '#fff'} 
                />
              </TouchableOpacity>

              <View style={styles.quantityDisplay}>
                <Text style={[styles.quantityNumber, isSelected && styles.quantityNumberSelected]}>
                  {quantity}
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.controlButton, quantity >= (dynamicPricing.maxBags || 20) && styles.controlButtonDisabled]}
                onPress={() => incrementBags(item.type)}
                disabled={quantity >= (dynamicPricing.maxBags || 20)}
              >
                <Ionicons 
                  name="add" 
                  size={18} 
                  color={quantity >= (dynamicPricing.maxBags || 20) ? '#ccc' : '#fff'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {getTotalBags() > 0 && (
        <>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Bags:</Text>
              <Text style={styles.summaryValue}>{getTotalBags()} bags</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Total:</Text>
              <Text style={styles.summaryTotal}>₱{getTotalCost().toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.selectedTypesContainer}>
            <Text style={styles.selectedTypesLabel}>Selected:</Text>
            <Text style={styles.selectedTypesText}>
              {getSelectedWasteTypes().join(', ')}
            </Text>
          </View>
        </>
      )}

      <View style={styles.noteContainer}>
        <Ionicons name="information-circle-outline" size={16} color="#666" />
        <Text style={styles.noteText}>
          Select waste types and specify how many bags for each type. Final price may vary based on actual waste collected.
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
  wasteTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  wasteTypeRowSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8e9',
  },
  wasteTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  wasteTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  wasteTypeText: {
    flex: 1,
  },
  wasteTypeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  wasteTypeNameSelected: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  wasteTypeSubtitle: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: '#4CAF50',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  quantityDisplay: {
    minWidth: 40,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  quantityNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  quantityNumberSelected: {
    color: '#4CAF50',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  selectedTypesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 6,
  },
  selectedTypesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  selectedTypesText: {
    fontSize: 12,
    color: '#2e7d32',
    lineHeight: 16,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
});

export default WasteTypeBagSelector;
